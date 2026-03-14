# Mynance - Personal Finance Tracker

A modern, real-time personal finance tracker built with React and Supabase. Track your expenses, analyze spending patterns, and manage multiple bank accounts all in one place.

## Features

- **Smart Expense Tracking**: Log expenses with categories (Needs, Wants, Investments) and subcategories
- **Multi-Account Support**: Manage expenses across multiple bank accounts
- **Real-Time Analytics**: 
  - Monthly expense breakdown with pie charts
  - Historical spending trends via bar charts
  - Top spending items visualization
  - Percentage-based category analysis
- **Excel Export**: Download all your expense data as a formatted Excel spreadsheet with monthly summaries
- **Month Navigation**: Easily browse expenses from past months with an intuitive month/year selector
- **Data Sync**: Seamless integration with Supabase for secure, real-time data synchronization
- **Responsive Design**: Beautiful dark-themed UI optimized for all devices
- **Local to Cloud Migration**: Automatically migrate expenses from local storage to Supabase

## Tech Stack

- **Frontend**: React 18 with Vite
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts for data visualization
- **Export**: XLSX (SheetJS) for Excel generation
- **Styling**: Custom CSS with dark theme design system

## Project Structure

```
├── src/
│   ├── App.jsx          # Main app component with Supabase integration
│   ├── Dashboard.jsx    # Dashboard with analytics and charts
│   ├── AddExpense.jsx   # Expense entry form with category management
│   ├── MonthView.jsx    # Monthly expense details view
│   ├── storage.js       # Local storage utilities
│   └── main.jsx         # Entry point
├── public/              # Static assets
├── package.json         # Project dependencies
└── vite.config.js       # Vite configuration
```

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Subhajit009iitr/Mynance.git
cd Mynance
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_key
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## Database Schema

### Tables

**expenses**
- `id`: UUID (primary key)
- `category`: Text (Needs, Wants, Investments)
- `subcategory`: Text
- `amount`: Decimal
- `date`: Date
- `bank`: Text (account name)
- `note`: Text (optional)
- `created_at`: Timestamp

**accounts**
- `id`: UUID (primary key)
- `name`: Text (account name)
- `created_at`: Timestamp

**subcategories**
- `id`: UUID (primary key)
- `category`: Text
- `name`: Text
- `created_at`: Timestamp

## Usage

### Adding an Expense

1. Click the **+** button to open the add expense dialog
2. Select a category (Needs, Wants, Investments)
3. Choose a subcategory
4. Enter the amount and select the date
5. Pick a bank account
6. Add an optional note
7. Submit to save

### Viewing Analytics

- **Dashboard**: View current month's total spending breakdown by category
- **Monthly Overview**: See spending trends across all months
- **Top Items**: Find your most frequent expenses
- **Charts**: Pie chart for category distribution, bar chart for monthly trends

### Managing Accounts

- Add new bank accounts to categorize expenses by source
- Delete accounts (expenses remain intact)
- Use accounts to track spending patterns across different sources

### Exporting Data

- Click **Export Excel** to download all expenses
- Includes separate sheets for each month plus an "All Expenses" summary
- Contains calculated totals for each category per month

## Features Explained

### Categories
- **Needs** (🏠): Essential expenses (food, utilities, rent)
- **Wants** (✨): Discretionary spending (entertainment, shopping)
- **Investments** (📈): Growth-focused expenses (stocks, education)

### Time Navigation
Navigate between months to review historical spending. Charts update automatically to reflect selected month data.

### Data Persistence
All data is stored in Supabase with real-time sync. Changes made on any device appear instantly across all connected sessions.

## Performance

- Optimized queries using Supabase REST API
- Memoized calculations for chart data
- Efficient re-renders with React hooks
- Responsive design that works on mobile, tablet, and desktop

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

Built with ❤️ by tracking every rupee counts
