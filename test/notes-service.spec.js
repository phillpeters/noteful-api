const { expect } = require('chai');
const knex = require('knex');
const NotesService = require('../src/notes/notes-service');
const { makeNotesArray } = require('./notes.fixtures');
const { makeFoldersArray } = require('./folders.fixtures');

describe('Notes service object', () => {
  let db;

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL
    });
  });

  before('clean the table', () => db.raw('truncate noteful_notes, noteful_folders restart identity cascade'));

  afterEach(() => db.raw('truncate noteful_notes, noteful_folders restart identity cascade'));

  after('disconnect from db', () => db.destroy());

  context(`Given noteful_notes has data`, () => {
    const testNotes = makeNotesArray();
    const testFolders = makeFoldersArray();
    
    beforeEach('insert notes', () => {
      return db
        .into('noteful_folders')
        .insert(testFolders)
        .then(() => {
          return db
            .into('noteful_notes')
            .insert(testNotes);
        });
    });

    it(`getAllNotes() resolves all notes from 'noteful_notes'`, () => {
      return NotesService.getAllNotes(db)
        .then(actual => {
          expect(actual).to.eql(testNotes.map(note => ({
            ...note,
            modified: new Date(note.modified)
          })));
        })
    });

    it(`getNotesByFolderId() resolves all notes with a folderId from the 'noteful_folders' table`, () => {
      const folderId = 2;
      const testNotesFromFolder = testNotes.filter(note => note.folderid === folderId);
      return NotesService.getNotesByFolderId(db, folderId)
        .then(actual => {
          expect(actual).to.eql(testNotesFromFolder.map(note => ({
            ...note,
            modified: new Date(note.modified)
          })));
        });
    });

    it(`getNoteById() resolves a note by id from the 'noteful_notes' table`, () => {
      const id = 5;
      const testNote = testNotes[id - 1];
      return NotesService.getNoteById(db, id)
        .then(actual => {
          expect(actual).to.eql({
            ...testNote,
            modified: new Date(testNote.modified)
          });
        });
    });

    it(`deleteNote() removes a note by id from 'noteful_notes' table`, () => {
      const noteId = 2;
      return NotesService.deleteNote(db, noteId)
        .then(() => NotesService.getAllNotes(db))
        .then(allNotes => {
          const expected = testNotes.filter(note => note.id !== noteId);
          expect(allNotes).to.eql(expected.map(note => ({
            ...note,
            modified: new Date(note.modified)
          })));
        });
    });
  });

  context('Given noteful_notes has no data', () => {
    it('getAllNotes() resolves an empty array', () => {
      return NotesService.getAllNotes(db)
        .then(actual => {
          expect(actual).to.eql([]);
        });
    });

    context(`add folders to 'noteful_folders due to foreign key constraints`, () => {
      const testFolders = makeFoldersArray();
      before('insert folders into notes_folders', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders);
      });

      it(`addNewNote() adds a new note and resolves the note with an 'id'`, () => {
        const newNote = {
          name: 'New test note',
          modified: new Date('2020-01-01T00:00:00.000Z'),
          folderid: 2,
          content: 'New test note content'
        };
        return NotesService.addNewNote(db, newNote)
          .then(actual => {
            expect(actual).to.eql({
              id: 1,
              ...newNote
            });
          });
      });
    });
  });
});