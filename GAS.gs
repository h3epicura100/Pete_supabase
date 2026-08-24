// Spreadsheet ID configuration
var SPREADSHEET_ID = "1By10bLNLHmXt0wwH4DOIeqyFFZ7VenXAhL_5JwWHtto";

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

// Main function to handle different actions
function doGet(e) {
  try {
    var sheetName = e && e.parameter && e.parameter.sheet;

    // No sheet requested - simple health check, same as before
    if (!sheetName) {
      return ContentService.createTextOutput("Google Apps Script is running.")
        .setMimeType(ContentService.MimeType.TEXT);
    }

    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Sheet not found: " + sheetName
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var values = sheet.getDataRange().getValues();

    // Build a gviz-style { table: { cols, rows } } payload so the existing
    // frontend parsing code (jsonData.table.rows / row.c[i].v) keeps working
    // unchanged - only the fetch URL and response parsing need to swap.
    var cols = (values[0] || []).map(function (header) {
      return { label: String(header) };
    });

    var rows = values.map(function (row) {
      return {
        c: row.map(function (cell) {
          return { v: cell === '' ? null : cell };
        })
      };
    });

    return ContentService.createTextOutput(JSON.stringify({
      table: { cols: cols, rows: rows }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error("Error in doGet:", error.message, error.stack);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Set CORS headers for all responses
function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

// Handle OPTIONS requests for CORS preflight
function doOptions(e) {
  var response = ContentService.createTextOutput('');
  return setCorsHeaders(response);
}

// Function to upload a file to Google Drive
function uploadFileToDrive(base64Data, fileName, mimeType, folderId) {
  try {
    // Remove the data URL prefix if it exists
    let fileData = base64Data;
    if (base64Data.indexOf('base64,') !== -1) {
      fileData = base64Data.split('base64,')[1];
    }
    
    // Decode the base64 data
    const decoded = Utilities.base64Decode(fileData);
    
    // Create a blob from the decoded data
    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    
    // Get the folder reference
    const folder = DriveApp.getFolderById(folderId);
    
    // Upload the file to the folder
    const file = folder.createFile(blob);
    
    // Make the file accessible via link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Return the direct link to view the file
    return "https://drive.google.com/uc?export=view&id=" + file.getId();
  } catch (error) {
    console.error("Error uploading file: " + error.toString());
    return null;
  }
}

// Main function to handle POST requests
function doPost(e) {
  try {
    // Log the incoming data for debugging
    console.log("Received POST request with parameters:", JSON.stringify(e.parameter));
    
    var params = e.parameter;
    
    // Check if this is a file upload action
    if (params.action === 'uploadFile') {
      // Extract file upload parameters
      var base64Data = params.base64Data;
      var fileName = params.fileName;
      var mimeType = params.mimeType;
      var folderId = params.folderId;
      
      // Validate required parameters
      if (!base64Data || !fileName || !mimeType || !folderId) {
        throw new Error("Missing required parameters for file upload");
      }
      
      // Upload the file to Google Drive
      var fileUrl = uploadFileToDrive(base64Data, fileName, mimeType, folderId);
      
      // Return the file URL
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        fileUrl: fileUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Existing sheet update logic
    var sheetName = params.sheetName;
    var action = params.action || 'insert';
    if (action === 'add') action = 'insert';
    
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }
    
    if (action === 'insert') {
      // Add a new row at the end of the sheet
      var rowData;
      try {
        rowData = JSON.parse(params.rowData);
        console.log("Parsed row data:", JSON.stringify(rowData));
      } catch (parseError) {
        console.error("Error parsing rowData:", parseError);
        throw new Error("Invalid rowData format: " + parseError.message);
      }
      
      // Verify we have data to add
      if (!Array.isArray(rowData) || rowData.length === 0) {
        throw new Error("Invalid or empty row data array");
      }
      
      // Append the row and return success
      sheet.appendRow(rowData);
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true,
        message: "Row added successfully",
        rowCount: sheet.getLastRow()
      })).setMimeType(ContentService.MimeType.JSON);
    } 
    else if (action === 'update') {
      // Update an existing row
      var rowIndex = parseInt(params.rowIndex);
      var rowData = JSON.parse(params.rowData);
      
      // Verify rowIndex is valid
      if (isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid row index for update: " + rowIndex);
      }
      
      // Update each cell in the row
      for (var i = 0; i < rowData.length; i++) {
        // Skip empty cells to preserve original data if not changed
        if (rowData[i] !== '') {
          sheet.getRange(rowIndex, i + 1).setValue(rowData[i]);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true,
        message: "Row updated successfully"
      })).setMimeType(ContentService.MimeType.JSON);
    } 
    else {
      throw new Error("Unknown action: " + action);
    }
  } catch (error) {
    console.error("Error in doPost:", error.message, error.stack);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: "Failed to process request: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}