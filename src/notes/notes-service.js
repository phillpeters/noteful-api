const NotesService = {
  getAllNotes(knex) {
    return knex
      .select('*')
      .from('noteful_notes');
  },

  getNotesByFolderId(knex, folderId) {
    return knex
      .select('*')
      .from('noteful_notes')
      .where('folderid', folderId);
  },

  getNoteById(knex, id) {
    return knex
      .select('*')
      .from('noteful_notes')
      .where('id', id)
      .first();
  },
  
  addNewNote(knex, newNote) {
    return knex
      .insert(newNote)
      .into('noteful_notes')
      .returning('*')
      .then(rows => {
        return rows[0];
      });
  },

  deleteNote(knex, id) {
    return knex('noteful_notes')
      .where({ id })
      .delete();
  }
};

module.exports = NotesService;