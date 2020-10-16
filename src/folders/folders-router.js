const path = require('path');
const express = require('express');
const FoldersService = require('./folders-service');

const foldersRouter = express.Router();
const jsonParser = express.json();

foldersRouter
  .route('/')
  .get((req, res, next) => {
    const knex = req.app.get('db');
    FoldersService.getAllFolders(knex)
      .then(folders => {
        res.json(folders);
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const knex = req.app.get('db');
    const { name } = req.body;
    const newFolder = { name };

    if (!name) {
      return res.status(400).json({
        error: { message: `Missing 'name' in request body` }
      });
    }

    FoldersService.addNewFolder(knex, newFolder)
      .then(folder => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${folder.id}`))
          .json(folder);
      })
      .catch(next);
  });

foldersRouter
  .route('/:folder_id')
  .get((req, res, next) => {
    const knex = req.app.get('db');
    FoldersService.getFolderById(knex, req.params.folder_id)
      .then(folder => {
        if (!folder) {
          return res.status(404).json({
            error: { message: `Folder doesn't exist` }
          });
        }
        res.json(folder)
      })
      .catch(next);
  });

module.exports = foldersRouter;