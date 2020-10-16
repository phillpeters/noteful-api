const path = require('path');
const express = require('express');
const NotesService = require('./notes-service');

const notesRouter = express.Router();
const jsonParser = express.json();

notesRouter
  .route('/')
  .get((req, res, next) => {
    const knex = req.app.get('db');
    NotesService.getAllNotes(knex)
      .then(notes => {
        res.json(notes);
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const knex = req.app.get('db');
    const { name, folderid, content } = req.body;
    const newNote = { name, folderid, content };

    for (const [key, value] of Object.entries({
      name: newNote.name,
      folderid: newNote.folderid
    })) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        });
      }
    }

    NotesService.addNewNote(knex, newNote)
      .then(note => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${note.id}`))
          .json(note);
      })
      .catch(next);
  });

notesRouter
  .route('/:note_id')
  .all((req, res, next) => {
    const knex = req.app.get('db');
    NotesService.getNoteById(
      knex,
      req.params.note_id
    )
      .then(note => {
        if (!note) {
          return res.status(404).json({
            error: { message: `Note doesn't exist` }
          });
        }
        res.note = note;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json(res.note);
  })
  .delete((req, res, next) => {
    const knex = req.app.get('db');
    NotesService.deleteNote(
      knex,
      req.params.note_id  
    )
      .then(() => {
        res.status(204).end();
      })
      .catch(next);
  });

notesRouter
  .route('/folder/:folder_id')
  .get((req, res, next) => {
    const knex = req.app.get('db');
    NotesService.getNotesByFolderId(knex, req.params.folder_id)
      .then(notes => {
        if (!notes) {
          res.status(204);
        }
        res.json(notes);
      })
      .catch(next);
  });

  module.exports = notesRouter;