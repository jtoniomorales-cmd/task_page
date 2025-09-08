require "test_helper"

class TaskTest < ActiveSupport::TestCase
  test "orders tasks by enum status and position" do
    Task.create!(title: "one first", status: :todo,        position: 0)
    Task.create!(title: "two first", status: :in_progress, position: 0)
    Task.create!(title: "one",       status: :todo,        position: 1)
    Task.create!(title: "two",       status: :done,        position: 1)

    assert_equal ["one first", "one", "two", "two first"],
                 Task.order_by_status_and_position.pluck(:title)
  end

  test "reorders positions when moving between statuses" do
    a = Task.create!(title: "A", status: :todo)
    b = Task.create!(title: "B", status: :todo)
    c = Task.create!(title: "C", status: :todo)
    d = Task.create!(title: "D", status: :done)
    e = Task.create!(title: "E", status: :done)

    b.update!(status: :done, position: 1)

    assert_equal [[a.id, 0], [c.id, 1]],
                 Task.where(status: :todo).order(:position).pluck(:id, :position)
    assert_equal [[d.id, 0], [b.id, 1], [e.id, 2]],
                 Task.where(status: :done).order(:position).pluck(:id, :position)
  end

  test "moves task within same status" do
    a = Task.create!(title: "A", status: :todo)
    b = Task.create!(title: "B", status: :todo)
    c = Task.create!(title: "C", status: :todo)

    c.update!(position: 1)

    assert_equal [[a.id, 0], [c.id, 1], [b.id, 2]],
                 Task.where(status: :todo).order(:position).pluck(:id, :position)
  end

  test "inserts task at given position on create" do
    a = Task.create!(title: "A", status: :todo)
    b = Task.create!(title: "B", status: :todo)

    d = Task.create!(title: "D", status: :todo, position: 1)

    assert_equal [[a.id, 0], [d.id, 1], [b.id, 2]],
                 Task.where(status: :todo).order(:position).pluck(:id, :position)
  end
end
