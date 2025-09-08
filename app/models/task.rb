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

  before_validation :assign_position, on: :create
  before_update     :adjust_positions_on_status_change
  before_update     :reorder_within_same_status

  def send_creation_message; Rails.logger.info("after creation entered"); end
  def send_message;          Rails.logger.info("entering before save");   end

  private

  def assign_position
    return unless position.nil?
    # ✅ use the setter
    self.position = (Task.where(status: status).maximum(:position) || -1) + 1
  end

  def adjust_positions_on_status_change
    return unless will_save_change_to_status?

    old_status = status_before_last_save
    old_pos    = position_before_last_save
    new_pos    = position

    Task.transaction do
      # default to end if no position supplied
      if new_pos.nil?
        self.position = (Task.where(status: status).maximum(:position) || -1) + 1
        new_pos = position
      else
        # make room in the new column
        Task.where(status: status)
            .where("position >= ?", new_pos)
            .update_all("position = position + 1")
      end

      # compact the old column (close the gap we left)
      if old_status.present? && !old_pos.nil?
        Task.where(status: old_status)
            .where("position > ?", old_pos)
            .update_all("position = position - 1")
      end
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
