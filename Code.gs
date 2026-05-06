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
          rooms: getSheetData('RoomAllotments')
        };
        break;
      case 'getRoomInfo':
        const team = e.parameter.team;
        responseData = getSheetData('RoomAllotments').find(room => room.teamName === team) || {};
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

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const pin = postData.adminPIN;
    
    // Example PIN Check
    if (['updateScore', 'updateFixture', 'addAnnouncement'].includes(action)) {
      if (pin !== "1234") {
         return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Invalid PIN" }))
           .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    let result = { success: true };
    
    switch(action) {
      case 'submitDemand':
        appendDemand(postData);
        break;
      case 'addAnnouncement':
        appendAnnouncement(postData);
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
