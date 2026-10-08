function App() {
  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo">📚 Library Management System</div>

        <div className="nav-links">
          <a href="#">Home</a>
          <a href="#">Books</a>
          <a href="#">About</a>
          <button className="login-btn">Login</button>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-content">
            <p className="eyebrow">LIBRARY MANAGEMENT SYSTEM</p>

            <h1>
              Your library,
              <br />
              <span>simplified.</span>
            </h1>

            <p className="description">
              A simple and efficient platform to discover books, manage
              borrowing, and keep your library organized.
            </p>

            <div className="hero-buttons">
              <button className="primary-btn">Browse Books</button>
              <button className="secondary-btn">Learn More</button>
            </div>
          </div>

          <div className="book-icon">📖</div>
        </section>

        <section className="features">
          <div className="feature-card">
            <div className="feature-icon">📚</div>
            <h3>Browse Books</h3>
            <p>
              Explore the available books and find what you are looking for.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔄</div>
            <h3>Easy Borrowing</h3>
            <p>
              Manage book borrowing and returns through one simple system.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📋</div>
            <h3>Stay Organized</h3>
            <p>
              Keep track of books, users, and library activities efficiently.
            </p>
          </div>
        </section>
      </main>

      <footer>
        <p>© 2026 Library Management System</p>
      </footer>
    </div>
  )
}

export default App