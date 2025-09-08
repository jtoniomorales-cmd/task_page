Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # Replace with your React dev server origin (Vite defaults to 5173)
    origins "http://localhost:5173"

    # Allow all API requests from React
    resource "/api/v1/*",
      headers: :any,
      methods: [ :get, :post, :put, :patch, :delete, :options, :head ]
  end
end
