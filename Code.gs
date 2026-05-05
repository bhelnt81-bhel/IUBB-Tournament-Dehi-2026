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
          foodMenu: getSheetData('FoodMenu')
        };
        break;
      case 'getRoomInfo':
        const team = e.parameter.team;
        // implementation to filter room sheet
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
        // SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Demands').appendRow([...]);
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

// Helper function to convert sheet data to JSON array
function getSheetData(sheetName) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
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
