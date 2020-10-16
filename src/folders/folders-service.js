const FoldersService = {
  getAllFolders(knex) {
    return knex.select('*').from('noteful_folders');
  },

  addNewFolder(knex, newFolder) {
    return knex
      .insert(newFolder)
      .into('noteful_folders')
      .returning('*')
      .then(rows => {
        return rows[0];
      });    
  },

  getFolderById(knex, id) {
    return knex
      .from('noteful_folders')
      .select('*')
      .where('id', id)
      .first();
  }
};

module.exports = FoldersService;