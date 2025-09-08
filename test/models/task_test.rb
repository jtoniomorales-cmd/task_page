require "test_helper"

class TaskTest < ActiveSupport::TestCase
  test "reorders positions when moving between statuses" do
    a = Task.create!(title: "A", status: "todo")
    b = Task.create!(title: "B", status: "todo")
    c = Task.create!(title: "C", status: "todo")
    d = Task.create!(title: "D", status: "done")
    e = Task.create!(title: "E", status: "done")

    b.update!(status: "done", position: 1)

    assert_equal [[a.id, 0], [c.id, 1]],
                 Task.where(status: "todo").order(:position).pluck(:id, :position)
    assert_equal [[d.id, 0], [b.id, 1], [e.id, 2]],
                 Task.where(status: "done").order(:position).pluck(:id, :position)
  end
end
