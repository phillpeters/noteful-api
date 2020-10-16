const { expect } = require('chai');
const knex = require('knex');
const supertest = require('supertest');
const app = require('../src/app');
const { makeFoldersArray } = require('../test/folders.fixtures');

describe('Folders endpoints', () => {
  let db;

  before(() => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL
    });
    app.set('db', db);
  });

  before('clean the table', () => db.raw('truncate noteful_notes, noteful_folders restart identity cascade'));
  
  afterEach('cleanup', () => db.raw('truncate noteful_notes, noteful_folders restart identity cascade'));

  after('disconnect from the database', () => db.destroy());

  describe('GET /api/folders', () => {
    context(`Given 'noteful_folders' has data`, () => {
      const testFolders = makeFoldersArray();
      
      beforeEach('insert folders', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders);
      });
  
      it('responds with 200 and all of the folders', () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, testFolders);
      });
    });

    context(`Given 'noteful_folders' has no data`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, []);
      });
    });
  });
  
  describe('GET /api/folders/:folder_id', () => {
    context(`Given 'noteful_folders' has data`, () => {
      const testFolders = makeFoldersArray();
      beforeEach('insert folders', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders);
      });

      it('reponds with 200 and the specified folder', () => {
        const folderId = 2;
        const expectedFolder = testFolders[folderId - 1];
        return supertest(app)
          .get(`/api/folders/${folderId}`)
          .expect(200, expectedFolder);
      });
    });

    context(`Given ':folder_id' does not exist`, () => {
      it(`responds with 404`, () => {
        const folderId = 123456;
        return supertest(app)
          .get(`/api/folders/${folderId}`)
          .expect(404, { error: { message: `Folder doesn't exist` } });
      });
    });
  });

  describe('POST /api/folders', () => {
    it('creates a folder, responding with 201 and the new folder', () => {
      const newFolder = {
        name: 'New test folder'
      };

      return supertest(app)
        .post('/api/folders')
        .send(newFolder)
        .expect(201)
        .expect(res => {
          expect(res.body.name).to.eql(newFolder.name);
          expect(res.body).to.have.property('id');
          expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`)
        })
        .then(postRes =>
          supertest(app)
            .get(`/api/folders/${postRes.body.id}`)
            .expect(postRes.body)
        );
    });

    it(`responds with 400 and an error message when the 'name' is missing`, () => {
      return supertest(app)
        .post('/api/folders')
        .send({})
        .expect(400, {
          error: { message: `Missing 'name' in request body` }
        });
    });
  });
});