export function setupRoutes(app) {
  app.get('/health', (req, res) => {
    res.json({ success: true, message: 'Server is running' });
  });
}
