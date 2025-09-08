class Api::V1::TasksController < ApplicationController
  before_action :set_task, only: [ :show, :update, :destroy ]
  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  def index
    @tasks = Task.ordered_by_status
    render json: @tasks
  end
  def show
    render json: @task
  end
  def create
    @task = Task.new(task_params)
    if @task.save
      render json: @task, status: :created
    else
      render json: { errors: @task.errors }, status: :unprocessable_entity
    end
    puts "created task"
  end
  def update
    if @task.update(task_params)
      render json: @task
    else
      render json: { errors: @task.errors }, status: :unprocessable_entity
    end
    puts "updated task"
  end
  def destroy
    @task.destroy()
    head :no_content
    puts "deleted task"
  end


  private

  def set_task
    @task = Task.find(params[:id])
  end

  def task_params
    params.require(:task).permit(:title, :description, :status, :due_date, :position)
  end

  def not_found
    render json: { error: "Not found" }, status: :not_found
  end
end
