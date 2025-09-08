class Task < ApplicationRecord
  validates :title, :status, presence: true

  after_create :send_creation_message
  before_save  :send_message

  # Align these values with the frontend. If your UI sends "todo",
  # use "todo" here too.
  enum :status, {
    todo:        "todo",
    in_progress: "in_progress",
    done:        "done"
  }, default: :todo

  # Order tasks by the logical status progression defined in the enum
  # rather than the default alphabetical order of the status column.
  scope :ordered_by_status, lambda {
    order(
      Arel.sql(
        "CASE status " +
          statuses.keys.map.with_index { |s, i| "WHEN '#{s}' THEN #{i}" }.join(" ") +
          " END"
      ),
      :position
    )
  }

  before_validation :assign_position, on: :create
  before_update     :push_to_end_if_column_changed
  before_update     :reorder_within_same_status

  def send_creation_message; Rails.logger.info("after creation entered"); end
  def send_message;          Rails.logger.info("entering before save");   end

  private

  def assign_position
    return unless position.nil?
    # ✅ use the setter
    self.position = (Task.where(status: status).maximum(:position) || -1) + 1
  end

  def push_to_end_if_column_changed
    # Only if status changed AND client didn't send a position:
    return unless will_save_change_to_status? && position.nil?

    # ✅ use the setter
    self.position = (Task.where(status: status).maximum(:position) || -1) + 1

    # Optional: compact the old column (close the gap we left)
    old_status = status_before_last_save
    old_pos    = position_before_last_save
    if old_status.present? && !old_pos.nil?
      Task.where(status: old_status)
          .where("position > ?", old_pos)
          .update_all("position = position - 1")
    end
  end

  def reorder_within_same_status
    return unless will_save_change_to_position?
    return if will_save_change_to_status? # handled above

    old_position = position_before_last_save
    new_position = position
    return if old_position.nil? || new_position.nil? || old_position == new_position

    Task.transaction do
      if new_position > old_position
        # move items between (old+1 .. new) up by 1
        Task.where(status: status, position: (old_position + 1)..new_position)
            .update_all("position = position - 1")
      else
        # move items between (new .. old-1) down by 1
        Task.where(status: status, position: new_position...old_position)
            .update_all("position = position + 1")
      end
      # keep self at new_position (already set)
    end
  end
end
