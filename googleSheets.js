const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwXiVJSkSTe_ROXHfEJo7TjNSCH5bth1iismidcwSYc8kI0kQPA0LxeBykg3VY981OW/exec'; // URL دیپلوی
async function callGoogleSheets(action, sheetName, data = null) {
  try {
    const params = new URLSearchParams({
      action,
      sheet: sheetName,
      ...(data && { data: JSON.stringify(data) })
    });
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    return await response.json();
  } catch (error) {
    console.error('Error calling Google Sheets:', error);
    return { success: false, error: error.message };
  }
}
function mapEmployeeToGS(item) {
  return {
    'Unique ID': item.__backendId,
    'نام کارمند': item.employeeName,
    'آیدی کارمند': item.employeeId,
    'دیپارتمنت': item.department,
    'شناسه اثر انگشت': item.fingerprintId
  };
}
function mapGSToEmployee(record) {
  return {
    type: 'employee',
    __backendId: record['Unique ID'],
    employeeName: record['نام کارمند'],
    employeeId: record['آیدی کارمند'],
    department: record['دیپارتمنت'],
    fingerprintId: record['شناسه اثر انگشت']
  };
}
async function syncEmployeesWithGoogleSheets(allDataRef) {
  try {
    const result = await callGoogleSheets('readAll', 'employees');
    if (result.success) {
      const gsEmployees = result.data
        .map(mapGSToEmployee)
        .filter(emp => emp.__backendId); 
      const nonEmployeeData = allDataRef.filter(d => d.type !== 'employee');
      allDataRef.length = 0; 
      allDataRef.push(...nonEmployeeData, ...gsEmployees);
      await saveData(allDataRef); 
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error syncing employees:', error);
    return false;
  }
}
function mapMotorcycleToGS(item) {
  return {
    'Unique ID': item.__backendId,
    'نام موتور سکیل': item.motorcycleName,
    'رنگ': item.motorcycleColor,
    'پلاک': item.motorcyclePlate,
    'دیپارتمنت': item.motorcycleDepartment
  };
}
function mapGSToMotorcycle(record) {
  return {
    type: 'motorcycle',
    __backendId: record['Unique ID'],
    motorcycleName: record['نام موتور سکیل'],
    motorcycleColor: record['رنگ'],
    motorcyclePlate: record['پلاک'],
    motorcycleDepartment: record['دیپارتمنت']
  };
}
async function syncMotorcyclesWithGoogleSheets(allDataRef) {
  try {
    const result = await callGoogleSheets('readAll', 'motors');
    if (result.success) {
      const gsMotorcycles = result.data
        .map(mapGSToMotorcycle)
        .filter(moto => moto.__backendId);
     
      const nonMotorcycleData = allDataRef.filter(d => d.type !== 'motorcycle');
      allDataRef.length = 0; 
      allDataRef.push(...nonMotorcycleData, ...gsMotorcycles);
      await saveData(allDataRef); 
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error syncing motorcycles:', error);
    return false;
  }
}

function mapRequestToGS(item) {
  return {
    'Unique ID': item.__backendId,
    'نام کارمند': item.employeeName,
    'آیدی کارمند': item.employeeId,
    'دیپارتمنت کارمند': item.department,
    'شناسه اثر انگشت': item.fingerprintId,
    'نام موتور سکیل': item.motorcycleName,
    'رنگ موتور سکیل': item.motorcycleColor,
    'پلاک موتور سکیل': item.motorcyclePlate,
    'دیپارتمنت موتور سکیل': item.motorcycleDepartment,
    'تاریخ درخواست': String(item.requestDate),
    'نام درخواست کننده': item.requesterFullName,
    'زمان خروج': item.exitTime || '',
    'زمان ورود': item.entryTime || '',
    'وضعیت': item.status
  };
}
function mapGSToRequest(record) {
  
  function formatDateToString(value) {
    if (typeof value === 'string') {
      if (value.includes('T')) { 
        const date = new Date(value);
        if (!isNaN(date.getTime())) { 
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}/${month}/${day}`;
        }
      } else if (value.includes('/')) { 
        return value;
      }
    } else if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    }
    return value || ''; 
  }
 
 
  function formatTimeToString(value) {
    if (typeof value === 'string') {
      if (value.includes('T')) { 
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }
      } else {
        return value; 
      }
    } else if (value instanceof Date) {
      return value.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return value || '';
  }
 
  return {
    type: 'request',
    __backendId: record['Unique ID'],
    employeeName: record['نام کارمند'],
    employeeId: record['آیدی کارمند'],
    department: record['دیپارتمنت کارمند'],
    fingerprintId: record['شناسه اثر انگشت'],
    motorcycleName: record['نام موتور سکیل'],
    motorcycleColor: record['رنگ موتور سکیل'],
    motorcyclePlate: record['پلاک موتور سکیل'],
    motorcycleDepartment: record['دیپارتمنت موتور سکیل'],
    requestDate: formatDateToString(record['تاریخ درخواست']), 
    requesterFullName: record['نام درخواست کننده'],
    exitTime: formatTimeToString(record['زمان خروج']) || '', 
    entryTime: formatTimeToString(record['زمان ورود']) || '', 
    status: record['وضعیت'],
    employeeId: record['آیدی کارمند'], 
    motorcycleId: record['Unique ID'] 
  };
}
async function syncRequestsWithGoogleSheets(allDataRef) {
  try {
    const result = await callGoogleSheets('readAll', 'request');
    if (result.success) {
      const gsRequests = result.data
        .map(mapGSToRequest)
        .filter(req => req.__backendId); 
      const nonRequestData = allDataRef.filter(d => d.type !== 'request');
      allDataRef.length = 0; 
      allDataRef.push(...nonRequestData, ...gsRequests);
      await saveData(allDataRef); 
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error syncing requests:', error);
    return false;
  }
}

function mapUserToGS(item) {
  return {
    'Unique ID': item.__backendId,
    'نام کامل': item.fullName,
    'نام کاربری': item.username,
    // 'رمز عبور': item.password,
    'نقش': item.role
  };
}
function mapGSToUser(record) {
  return {
    __backendId: record['Unique ID'],
    fullName: record['نام کامل'],
    username: record['نام کاربری'],
    // password: record['رمز عبور'],
    role: record['نقش']
  };
}