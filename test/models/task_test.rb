require "test_helper"

class TaskTest < ActiveSupport::TestCase
  test "orders tasks by enum status and position" do
    Task.delete_all

    Task.create!(title: "done first", status: :done, position: 0)
    Task.create!(title: "todo first", status: :todo, position: 0)
    Task.create!(title: "in progress", status: :in_progress, position: 0)

    assert_equal %w[todo in_progress done], Task.ordered_by_status.pluck(:status)
  end
end
