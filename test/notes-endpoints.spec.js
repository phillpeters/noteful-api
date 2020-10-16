const knex = require('knex');
const supertest = require('supertest');
const app = require('../src/app');
const { makeNotesArray } = require('../test/notes.fixtures');
const { makeFoldersArray } = require('../test/folders.fixtures');
const { get } = require('../src/app');
const { expect } = require('chai');

describe('Notes endpoints', () => {
  let db;

  before(() => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL
    });
    app.set('db', db);
  });

  before('clean the table', () => db.raw('truncate noteful_notes, noteful_folders restart identity cascade'));
  
  afterEach('cleanup', () => db.raw('truncate noteful_notes, noteful_folders restart identity cascade'));

  after('disconnect from the database', () => db.destroy());

  describe('GET /api/notes', () => {
    context(`Given 'noteful_notes' has data`, () => {
      const testNotes = makeNotesArray();
      const testFolders = makeFoldersArray();
      
      beforeEach('insert notes', () => {
        return db
          // insert folders first due to foreign key constraints
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('noteful_notes')
              .insert(testNotes);
          });
      });

      it('responds with 200 and all of the notes', () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, testNotes);
      });
    });

    context(`Given 'noteful_notes' has no data`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, []);
      });
    });
  });

  describe(`GET /api/notes/:note_id`, () => {
    context(`Given 'noteful_notes' has data`, () => {
      const testNotes = makeNotesArray();
      const testFolders = makeFoldersArray();
      
      beforeEach('insert notes', () => {
        return db
          // insert folders first due to foreign key constraints
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('noteful_notes')
              .insert(testNotes);
          });
      });

      it('responds with 200 and the specified note', () => {
        const noteId = 4;
        const expectedNote = testNotes[noteId - 1];
        return supertest(app)
          .get(`/api/notes/${noteId}`)
          .expect(200, expectedNote);
      });
    });

    context(`Given ':note_id' does not exist`, () => {
      it(`responds with 404`, () => {
        const noteId = 123456;
        return supertest(app)
          .get(`/api/notes/${noteId}`)
          .expect(404, { error: { message: `Note doesn't exist` } });
      });
    });
  });

  describe(`GET /api/notes/folder/:folder_id`, () => {
    context(`Given 'noteful_notes has data`, () => {
      const testNotes = makeNotesArray();
      const testFolders = makeFoldersArray();
      
      beforeEach('insert notes', () => {
        return db
          // insert folders first due to foreign key constraints
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('noteful_notes')
              .insert(testNotes);
          });
      });
      
      it(`responds with 200 and all notes from the specified folder`, () => {
        const folderId = 2;
        const expectedNotes = testNotes.filter(note => note.folderid === folderId);
        return supertest(app)
          .get(`/api/notes/folder/${folderId}`)
          .expect(200, expectedNotes);
      });
    });

    context(`Given specified folder contains no notes`, () => {
      beforeEach('insert notes', () => {
        const testNotes = makeNotesArray();
        const testFolders = makeFoldersArray();
        
        // insert folders first due to foreign key constraints
        return db
          .into('noteful_folders')
          .insert([...testFolders, { id: 4, name: 'New test folder' }])
          .then(() => {
            return db
              .into('noteful_notes')
              .insert(testNotes);
          });
      });

      it(`responds with 200 and an empty list`, () => {
        const folderId = 4;
        return supertest(app)
          .get(`/api/notes/folder/${folderId}`)
          .expect(200, []);
      });
    });
  });

  describe(`POST /api/notes`, () => {
    // insert folders first due to foreign key constraints
    beforeEach('insert folders', () => {
      const testFolders = makeFoldersArray();
      return db
        .into('noteful_folders')
        .insert([...testFolders]);
      });
    
    it(`creates a note, responding with 201 and the new note`, function() {
      this.retries(3);
      const newNote = {
        name: 'New test note',
        folderid: 2,
        content: 'Content for new test note'
      };

      return supertest(app)
        .post('/api/notes')
        .send(newNote)
        .expect(201)
        .expect(res => {
          expect(res.body.name).to.eql(newNote.name);
          expect(res.body.folderid).to.eql(newNote.folderid);
          expect(res.body.content).to.eql(newNote.content);
          expect(res.body).to.have.property('id');
          expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`);
          const expected = new Date().toLocaleString();
          const actual = new Date(res.body.modified).toLocaleString();
          expect(actual).to.eql(expected);
        })
        .then(postRes => 
          supertest(app)
            .get(`/api/notes/${postRes.body.id}`)
            .expect(postRes.body)
        );
    });

    const requiredFields = ['name', 'folderid'];

    requiredFields.forEach(field => {
      const newNote = {
        name: 'New test note',
        folderid: 2,
        content: 'Content for new test note'
      };

      it(`responds with 400 and an error message when the '${field} is missing`, () => {
        delete newNote[field];

        return supertest(app)
          .post('/api/notes')
          .send(newNote)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          });
      });
    });
  });

  describe(`DELETE /api/notes/:note_id`, () => {
    context('Given there are notes in the database', () => {
      const testNotes = makeNotesArray();

      beforeEach('insert notes', () => {
        const testNotes = makeNotesArray();
        const testFolders = makeFoldersArray();
        
        // insert folders first due to foreign key constraints
        return db
          .into('noteful_folders')
          .insert([...testFolders, { id: 4, name: 'New test folder' }])
          .then(() => {
            return db
              .into('noteful_notes')
              .insert(testNotes);
          });
      });

      it('responds with 204 and removes the note', () => {
        const idToRemove = 3;
        const expectedNotes = testNotes.filter(note => note.id !== idToRemove);
        return supertest(app)
          .delete(`/api/notes/${idToRemove}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/notes`)
              .expect(expectedNotes)
          );
      });
    });

    context(`Given there are no notes in the database`, () => {
      it('responds with 404', () => {
        const noteId = 123456;
        return supertest(app)
          .delete(`/api/notes/${noteId}`)
          .expect(404, { error: { message: `Note doesn't exist` } });
      });
    });
  });
});