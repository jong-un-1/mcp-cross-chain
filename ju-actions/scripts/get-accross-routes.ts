// Function to transform token route data from JSON
function transformTokenRoutes(jsonData: any[]) {
  // Transform the data into the desired format
  const routes = jsonData.map(
    (item: { originToken: any; destinationToken: any }) => [
      item.originToken.toLowerCase(),
      item.destinationToken.toLowerCase(),
    ],
  );

  return routes;
}

// Read and parse the JSON file
async function processTokenRoutesFile() {
  try {
    // Read the file
    const fileContent = await fetch('https://across.to/api/available-routes');

    // Parse the JSON data
    const jsonData = await fileContent.json();

    // Transform the data
    const routes = transformTokenRoutes(jsonData);

    // Format the output
    return JSON.stringify(routes, null, 2);
  } catch (error) {
    console.error('Error processing file:', error);
    return null;
  }
}

// Usage example:
// processTokenRoutesFile('paste.txt').then(result => {
//   if (result) {
//     console.log(result);
//     // Or write to a file, display in UI, etc.
//   }
// });

// For direct execution:
(async () => {
  const result = await processTokenRoutesFile();
  if (result) {
    console.log(result);
  }
})();
