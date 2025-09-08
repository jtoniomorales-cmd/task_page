class AddPositionToTasks < ActiveRecord::Migration[7.1]
  def up
    add_column :tasks, :position, :integer, null: false, default: 0
    add_index :tasks, [ :status, :position ]

    execute <<~SQL
      WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at) - 1 AS pos
        FROM tasks
      )
      UPDATE tasks
      SET position = ranked.pos
      FROM ranked
      WHERE ranked.id = tasks.id;
    SQL
  end

  def down
    remove_index :tasks, [ :status, :position ]
    remove_column :tasks, :position
  end
end
