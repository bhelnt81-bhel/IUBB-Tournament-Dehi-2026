/**
 * Google Apps Script Backend for BHEL Hoops PWA
 * 
 * Instructions:
 * 1. Create a new Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Paste this code into Code.gs
 * 4. Deploy > New Deployment > Web App (Execute as: Me, Who has access: Anyone)
 * 5. Copy the Web App URL and paste it into config.js
 */

const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE"; // Optional if bound to sheet

function doGet(e) {
  const action = e.parameter.action;
  
  if (!action) {
    return ContentService.createTextOutput("Action parameter is required.").setMimeType(ContentService.MimeType.TEXT);
  }
  
  try {
    let responseData = {};
    
    // Switch case for different GET actions
    // For local development, returning the structure is enough.
    // Replace with SpreadsheetApp calls for production.
    switch(action) {
      case 'getAll':
        responseData = {
          teams: getSheetData('Teams'),
          fixtures: getSheetData('Fixtures'),
          standings: getSheetData('Standings'),
          announcements: getSheetData('Announcements'),
          demands: getSheetData('Demands'),
          foodMenu: getSheetData('FoodMenu'),
          contacts: getSheetData('Contacts'),
          infoPages: getSheetData('InfoPages'),
          rooms: getSheetData('RoomAllotments')
        };
        break;
      case 'getRoomInfo':
        const team = e.parameter.team;
        responseData = getRoomInfo(team);
        break;
      default:
        responseData = { error: "Unknown action" };
    }
    
    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getRoomInfo(team) {
  const roomInfo = getSheetData('RoomAllotments').find(room => room.teamName === team);
  if (roomInfo) return roomInfo;

  const teamInfo = getSheetData('Teams').find(row => row.teamName === team);
  if (!teamInfo || !teamInfo.roomAllotted) return {};

  return {
    teamName: teamInfo.teamName,
    roomNo: teamInfo.roomAllotted,
    location: teamInfo.unitName || '',
    amenitiesNote: ''
  };
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const pin = postData.adminPIN;
    
    if (isAdminAction(action)) {
      if (!isValidAdminPin(pin)) {
         return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Invalid PIN" }))
           .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    let result = { success: true };
    
    switch(action) {
      case 'verifyAdmin':
        result = { success: true };
        break;
      case 'submitDemand':
        appendDemand(postData);
        break;
      case 'addAnnouncement':
        appendAnnouncement(postData);
        break;
      case 'saveTeam':
        upsertTeam(postData);
        break;
      case 'saveFixture':
        upsertFixture(postData);
        recalculateStandings();
        break;
      case 'saveFoodMenu':
        upsertFoodMenu(postData);
        break;
      case 'saveContact':
        upsertContact(postData);
        break;
      case 'saveInfoPage':
        upsertInfoPage(postData);
        break;
      case 'updateDemandStatus':
        updateDemandStatus(postData);
        break;
      default:
        result = { success: false, error: "Unknown POST action" };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function isAdminAction(action) {
  return [
    'verifyAdmin',
    'updateScore',
    'updateFixture',
    'addAnnouncement',
    'saveTeam',
    'saveFixture',
    'saveFoodMenu',
    'saveContact',
    'saveInfoPage',
    'updateDemandStatus'
  ].includes(action);
}

function isValidAdminPin(pin) {
  const config = getSheetData('Config')[0] || {};
  const configuredPin = config.adminPIN || config.adminPin || '1234';
  return String(pin || '') === String(configuredPin);
}

function appendDemand(data) {
  const sheet = getSpreadsheet().getSheetByName('Demands');
  if (!sheet) throw new Error('Demands sheet not found');
  sheet.appendRow([
    new Date().getTime(),
    new Date(),
    data.team || data.teamName || '',
    data.category || '',
    data.description || '',
    'Pending',
    ''
  ]);
}

function appendAnnouncement(data) {
  const sheet = getSpreadsheet().getSheetByName('Announcements');
  if (!sheet) throw new Error('Announcements sheet not found');
  sheet.appendRow([
    new Date().getTime(),
    new Date(),
    data.title || '',
    data.message || '',
    data.priority || 'Normal'
  ]);
}

function upsertTeam(data) {
  const sheet = getSpreadsheet().getSheetByName('Teams');
  if (!sheet) throw new Error('Teams sheet not found');

  const teamName = data.teamName || data.name || '';
  if (!teamName) throw new Error('Team name is required');

  upsertRowByKey(sheet, 'TeamName', teamName, {
    TeamID: data.teamID || data.teamId || new Date().getTime(),
    TeamName: teamName,
    UnitName: data.unitName || data.unit || '',
    CaptainName: data.captainName || '',
    ManagerName: data.managerName || '',
    RoomAllotted: data.roomAllotted || data.room || '',
    ContactNumber: data.contactNumber || ''
  });
}

function upsertFixture(data) {
  const sheet = getSpreadsheet().getSheetByName('Fixtures');
  if (!sheet) throw new Error('Fixtures sheet not found');

  const matchId = data.matchID || data.matchId || new Date().getTime();
  upsertRowByKey(sheet, 'MatchID', matchId, {
    MatchID: matchId,
    Date: data.date || '',
    Time: data.time || '',
    Team1: data.team1 || '',
    Team2: data.team2 || '',
    Venue: data.venue || '',
    Status: data.status || 'Scheduled',
    Team1Score: Number(data.team1Score || 0),
    Team2Score: Number(data.team2Score || 0),
    Winner: data.winner || ''
  });
}

function upsertFoodMenu(data) {
  const sheet = getSpreadsheet().getSheetByName('FoodMenu');
  if (!sheet) throw new Error('FoodMenu sheet not found');

  const date = data.date || '';
  const mealType = data.mealType || data.meal || '';
  if (!date || !mealType) throw new Error('Date and meal type are required');

  const key = date + '|' + mealType;
  upsertRowByCompositeKey(sheet, ['Date', 'MealType'], key, {
    Date: date,
    MealType: mealType,
    MenuItems: data.menuItems || data.items || '',
    Timing: data.timing || ''
  });
}

function upsertContact(data) {
  const sheet = getSpreadsheet().getSheetByName('Contacts');
  if (!sheet) throw new Error('Contacts sheet not found');

  const contactId = data.contactID || data.contactId || new Date().getTime();
  const name = data.name || '';
  const phone = data.phone || data.contactNumber || '';
  if (!name || !phone) throw new Error('Name and phone are required');

  upsertRowByKey(sheet, 'ContactID', contactId, {
    ContactID: contactId,
    Name: name,
    Role: data.role || 'Other',
    TeamName: data.teamName || data.team || '',
    Phone: phone,
    Priority: data.priority || 99,
    IsPublic: data.isPublic || 'TRUE'
  });
}

function upsertInfoPage(data) {
  const sheet = getSpreadsheet().getSheetByName('InfoPages');
  if (!sheet) throw new Error('InfoPages sheet not found');

  const infoId = data.infoID || data.infoId || new Date().getTime();
  const title = data.title || '';
  if (!title) throw new Error('Title is required');

  upsertRowByKey(sheet, 'InfoID', infoId, {
    InfoID: infoId,
    Category: data.category || 'Other',
    Title: title,
    Description: data.description || data.details || '',
    MapLink: data.mapLink || '',
    Phone: data.phone || '',
    SortOrder: data.sortOrder || 99
  });
}

function updateDemandStatus(data) {
  const sheet = getSpreadsheet().getSheetByName('Demands');
  if (!sheet) throw new Error('Demands sheet not found');

  const demandId = data.demandID || data.demandId || data.id;
  const fields = {
    Status: data.status || 'Resolved',
    AdminRemarks: data.adminRemarks || ''
  };

  if (demandId) {
    updateRowFieldsByKey(sheet, 'DemandID', demandId, fields);
    return;
  }

  updateDemandByDetails(sheet, data, fields);
}

function recalculateStandings() {
  const sheet = getSpreadsheet().getSheetByName('Standings');
  if (!sheet) return;

  const teams = getSheetData('Teams').map(team => team.teamName).filter(Boolean);
  const stats = {};
  teams.forEach(team => {
    stats[team] = { played: 0, won: 0, lost: 0, points: 0 };
  });

  getSheetData('Fixtures').forEach(match => {
    if (match.status !== 'Completed') return;
    const team1 = match.team1;
    const team2 = match.team2;
    if (!team1 || !team2) return;

    if (!stats[team1]) stats[team1] = { played: 0, won: 0, lost: 0, points: 0 };
    if (!stats[team2]) stats[team2] = { played: 0, won: 0, lost: 0, points: 0 };

    stats[team1].played += 1;
    stats[team2].played += 1;

    const score1 = Number(match.team1Score || 0);
    const score2 = Number(match.team2Score || 0);
    const winner = match.winner || (score1 > score2 ? team1 : score2 > score1 ? team2 : '');

    if (winner === team1) {
      stats[team1].won += 1;
      stats[team1].points += 2;
      stats[team2].lost += 1;
    } else if (winner === team2) {
      stats[team2].won += 1;
      stats[team2].points += 2;
      stats[team1].lost += 1;
    }
  });

  const rows = Object.keys(stats).map(team => [
    team,
    stats[team].played,
    stats[team].won,
    stats[team].lost,
    stats[team].points
  ]);

  sheet.clearContents();
  sheet.getRange(1, 1, 1, 5).setValues([['TeamName', 'Played', 'Won', 'Lost', 'Points']]);
  if (rows.length) sheet.getRange(2, 1, rows.length, 5).setValues(rows);
}

function upsertRowByKey(sheet, keyHeader, keyValue, fields) {
  const headers = getHeaders(sheet);
  const keyColumn = headers.indexOf(keyHeader);
  if (keyColumn === -1) throw new Error(keyHeader + ' column not found');

  const values = sheet.getDataRange().getValues();
  let rowNumber = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][keyColumn]) === String(keyValue)) {
      rowNumber = i + 1;
      break;
    }
  }

  if (rowNumber === -1) rowNumber = sheet.getLastRow() + 1;
  writeFieldsToRow(sheet, headers, rowNumber, fields);
}

function upsertRowByCompositeKey(sheet, keyHeaders, compositeKey, fields) {
  const headers = getHeaders(sheet);
  const keyColumns = keyHeaders.map(header => headers.indexOf(header));
  if (keyColumns.some(index => index === -1)) throw new Error('FoodMenu key columns not found');

  const values = sheet.getDataRange().getValues();
  let rowNumber = -1;
  for (let i = 1; i < values.length; i++) {
    const key = keyColumns.map(index => values[i][index]).join('|');
    if (String(key) === String(compositeKey)) {
      rowNumber = i + 1;
      break;
    }
  }

  if (rowNumber === -1) rowNumber = sheet.getLastRow() + 1;
  writeFieldsToRow(sheet, headers, rowNumber, fields);
}

function updateRowFieldsByKey(sheet, keyHeader, keyValue, fields) {
  const headers = getHeaders(sheet);
  const keyColumn = headers.indexOf(keyHeader);
  if (keyColumn === -1) throw new Error(keyHeader + ' column not found');

  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][keyColumn]) === String(keyValue)) {
      writeFieldsToRow(sheet, headers, i + 1, fields);
      return;
    }
  }
  throw new Error('Matching row not found');
}

function updateDemandByDetails(sheet, data, fields) {
  const headers = getHeaders(sheet);
  const teamColumn = headers.indexOf('TeamName');
  const categoryColumn = headers.indexOf('Category');
  const descriptionColumn = headers.indexOf('Description');
  if ([teamColumn, categoryColumn, descriptionColumn].some(index => index === -1)) {
    throw new Error('Demand matching columns not found');
  }

  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    const matches =
      String(values[i][teamColumn]) === String(data.teamName || data.team || '') &&
      String(values[i][categoryColumn]) === String(data.category || '') &&
      String(values[i][descriptionColumn]) === String(data.description || '');
    if (matches) {
      writeFieldsToRow(sheet, headers, i + 1, fields);
      return;
    }
  }
  throw new Error('Matching demand not found');
}

function writeFieldsToRow(sheet, headers, rowNumber, fields) {
  headers.forEach((header, index) => {
    if (Object.prototype.hasOwnProperty.call(fields, header)) {
      sheet.getRange(rowNumber, index + 1).setValue(fields[header]);
    }
  });
}

function getHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(header => header.toString().trim());
}

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID !== 'YOUR_SPREADSHEET_ID_HERE') {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

// Helper function to convert sheet data to JSON array
function getSheetData(sheetName) {
  try {
    const sheet = getSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return []; // No data rows
    
    const headers = data[0];
    const rows = data.slice(1);
    
    return rows.map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        let key = header.toString().trim();
        if (key) {
           key = key.charAt(0).toLowerCase() + key.slice(1);
           obj[key] = row[index];
        }
      });
      return obj;
    });
  } catch(e) {
    return [];
  }
}
