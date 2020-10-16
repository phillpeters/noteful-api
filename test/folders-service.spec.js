const knex = require('knex');
const FoldersService = require('../src/folders/folders-service');
const { makeFoldersArray } = require('./folders.fixtures');

describe('Folders service object', function() {
  let db;

  before(() => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL
    });
  });

  before(() => db.raw('truncate noteful_notes, noteful_folders restart identity cascade'));
  
  afterEach(() => db.raw('truncate noteful_notes, noteful_folders restart identity cascade'));

  after(() => db.destroy());

  context(`Given 'noteful_folders' has data`, () => {
    const testFolders = makeFoldersArray();
    
    beforeEach(() => {
      return db
        .into('noteful_folders')
        .insert(testFolders);
    });

    it(`getAllFolders() resolves all folders from 'noteful_folders' table`, () => {
      return FoldersService.getAllFolders(db)
        .then(actual => {
          expect(actual).to.eql(testFolders);
        });
    });

    it(`getFolderById() resolves a folder by id from 'noteful_folders' table`, () => {
      const id = 3;
      const testFolder = testFolders[id - 1];
      return FoldersService.getFolderById(db, id)
        .then(actual => {
          expect(actual).to.eql(testFolder);
        });
    });
  });

  context(`Given 'noteful_folders' has no data`, () => {
    it(`getAllFolders() resolves an empty array`, () => {
      return FoldersService.getAllFolders(db)
        .then(actual => {
          expect(actual).to.eql([]);
        });
    });

    it(`addNewFolder() adds a new folder and resolves the folder with an 'id'`, () => {
      const newFolder = {
        name: 'new test folder'
      };
      return FoldersService.addNewFolder(db, newFolder)
        .then(actual => {
          expect(actual).to.eql({
            id: 1,
            name: newFolder.name
          });
        });
    });
  });
});