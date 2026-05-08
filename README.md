# BHEL Hoops - Basketball Tournament Management PWA

## Mission Objective
A fully functional Progressive Web App (PWA) for managing the Inter Unit Basketball Tournament 2026. Built with Vanilla JS, HTML, and CSS, it utilizes Google Apps Script as a backend.

## File Structure
- `index.html`: Main UI template.
- `style.css`: All styling, implementing the BHEL branding and mobile-first layout.
- `app.js`: Client-side logic, routing, and state management.
- `config.js`: Configuration variables (URLs, Tournament details, Admin PIN).
- `manifest.json`: PWA configuration.
- `sw.js`: Service worker for offline caching.
- `Code.gs`: Google Apps Script backend code.

## Deployment Instructions

### 1. Google Sheets Setup
1. Create a new Google Sheet.
2. Create the following Tabs exactly as named:
   - `Teams` (Cols: TeamID, TeamName, UnitName, CaptainName, ManagerName, RoomAllotted, ContactNumber)
   - `Fixtures` (Cols: MatchID, Date, Time, Team1, Team2, Venue, Status, Team1Score, Team2Score, Winner)
   - `Standings` (Cols: TeamName, Played, Won, Lost, Points)
   - `Demands` (Cols: DemandID, Timestamp, TeamName, Category, Description, Status, AdminRemarks)
   - `Announcements` (Cols: AnnID, Timestamp, Title, Message, Priority)
   - `RoomAllotments` (Cols: RoomNo, Location, TeamName, CheckIn, CheckOut, AmenitiesNote)
   - `FoodMenu` (Cols: Date, MealType, MenuItems, Timing)
   - `Contacts` (Cols: ContactID, Name, Role, TeamName, Phone, Priority, IsPublic)
   - `InfoPages` (Cols: InfoID, Category, Title, Description, MapLink, Phone, SortOrder)
   - `Config` (Cols: AdminPIN, TournamentName, StartDate, EndDate, Venue)

### 2. Google Apps Script Setup
1. In your Google Sheet, click `Extensions > Apps Script`.
2. Clear any existing code and paste the contents of `Code.gs`.
3. Click `Deploy > New Deployment`.
4. Select type: **Web App**.
5. Execute as: **Me**.
6. Who has access: **Anyone**.
7. Click `Deploy`, authorize permissions, and copy the provided **Web App URL**.

### 3. Frontend Setup & Configuration
1. Open `config.js`.
2. Replace `MOCK_MODE` in `APPS_SCRIPT_URL` with your copied Web App URL.
   *(Note: Keeping it as `MOCK_MODE` allows the app to run with sample local data for testing).*
3. Adjust dates and tournament names as necessary.

### 4. Deploying to Netlify/Vercel
1. Push this `tournament-app` folder to a GitHub repository.
2. Log into Vercel or Netlify.
3. Import the repository.
4. Set the publish directory to the root of the repository (or the folder if placed inside one).
5. Deploy.

## Testing Locally
To test the app locally, you can use any static server, e.g., using Python:
```bash
cd tournament-app
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.
