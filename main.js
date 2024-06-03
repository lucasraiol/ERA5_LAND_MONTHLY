///Extract mean/month for graphs

// Load geometry from feature collection (example)
var flona_jamanxim = ee.FeatureCollection('projects/ee-lucasraiolsk8/assets/flona_jamanxim');

// Extract geometry from feature collection
var geometry = flona_jamanxim.geometry();

// Function to calculate monthly average and convert to Celsius
function getMonthlyMean(year, month) {
    var startDate = ee.Date.fromYMD(year, month, 1);
    var endDate = startDate.advance(1, 'month');
    var dataset = ee.ImageCollection('ECMWF/ERA5_LAND/MONTHLY_AGGR').filterDate(startDate, endDate).filterBounds(geometry).select('temperature_2m').mean().subtract(273.15).set('year', year).set('month', month);
    return dataset;
}

// List of years of interest
var years = ee.List.sequence(2000, 2022);

// List of months
var months = ee.List.sequence(1, 12);

// Calculate the monthly average for each year and each month
var monthlyMeans = ee.ImageCollection.fromImages(years.map(function(year) {
    return months.map(function(month) {
        return getMonthlyMean(year, month);
    });
}).flatten());

// Convert image collection to a table
var monthlyMeanTable = monthlyMeans.map(function(image) {
    return ee.Feature(null, {
        'year': image.get('year'),
        'month': image.get('month'),
        'temperature': image.reduceRegion({
            reducer: ee.Reducer.mean(),
            geometry: geometry,
            scale: 10000
        }).get('temperature_2m')
    });
});

// Export data to Google Drive
Export.table.toDrive({
    collection: monthlyMeanTable,
    description: 'Monthly_Mean_Temperature_2000_2022_Celsius',
    fileFormat: 'CSV'
});

// Visualization
print(monthlyMeanTable);

// Function to group data by year and month
var results = monthlyMeanTable.reduceColumns(ee.Reducer.toList(3), ['year', 'month', 'temperature']);
var data = ee.List(results.get('list'));

// Create a list of objects for the chart
var chartData = data.map(function(item) {
    var year = ee.Number(ee.List(item).get(0));
    var month = ee.Number(ee.List(item).get(1));
    var temperature = ee.Number(ee.List(item).get(2));
    var date = ee.Date.fromYMD(year, month, 1);
    return ee.Feature(null, {
        'date': date,
        'temperature': temperature
    });
});

// Convert for a FeatureCollection
var chartFeatureCollection = ee.FeatureCollection(chartData);

// Create the chart
var chart = ui.Chart.feature.byFeature({
    features: chartFeatureCollection,
    xProperty: 'date',
    yProperties: ['temperature']
}).setChartType('LineChart').setOptions({
    title: 'Monthly Mean Temperature (2000-2022)',
    hAxis: {
        title: 'Date'
    },
    vAxis: {
        title: 'Temperature (°C)'
    },
    lineWidth: 1,
    pointSize: 3,
    series: {
        0: {
            color: 'blue'
        }
    }
});

// Add the chart to the GEE dashboard
print(chart);

// Calculate the average of all monthly averages
var overallMean = monthlyMeans.mean();

// Set display parameters in Celsius
var visualization = {
    min: -23.15, // 250 K em Celsius
    max: 46.85, // 320 K em Celsius
    palette: ['000080', '0000d9', '4000ff', '8000ff', '0080ff', '00ffff', '00ff80', '80ff00', 'daff00', 'ffff00', 'fff500', 'ffda00', 'ffb000', 'ffa400', 'ff4f00', 'ff2500', 'ff0a00', 'ff00ff', ]
};

// Add layer to map
Map.setCenter(-55.0, -6.0, 6);
// Adjust coordinates and zoom as needed
Map.addLayer(overallMean.clip(geometry), visualization, 'Overall Mean Temperature (2000-2022) in °C');
