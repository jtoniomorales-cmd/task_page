class AddDetailsToTasks < ActiveRecord::Migration[8.0]
  def change
    add_column :tasks, :due_date, :date unless column_exists?(:tasks, :due_date)
  end
end
