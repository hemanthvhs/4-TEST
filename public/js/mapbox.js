/* eslint-disable */
// The above line make sure that eslint will be disabled for this file

// In the pug file for div with id map, we have set the data attribute for locations as data-locations = JSON.stringify(tour.locations). Since we cannot set the js objects to the attributes thats the reason we have converted that to the string.
// Now here we are converting that JSON string to the JS object using JSON.parse()

export const displayMap = (locations) => {
  console.log(locations);

  mapboxgl.accessToken =
    'pk.eyJ1IjoiaGVtYW50aHZocyIsImEiOiJja3IzMzQxcDMxZGR5MnNyeHE4bTJ2ZDNlIn0.cnOllD6-8ZUrZYeDdUfNkA';

  var map = new mapboxgl.Map({
    container: 'map', // 'map' means the mapbox inserts map into the html whose element has id map
    style: 'mapbox://styles/hemanthvhs/ckr37t74fecc218o08uxz4jqo',
    scrollZoom: false,
    // The reason why below center is commented is because we have got the various locations & based on these locations we want to center the map
    // center: [-118.113491, 34.111745], // starting position [lng, lat]
    // zoom: 10,
    // interactive: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  // Adding marker which is custom css pin on the each locations
  // refers tours.json in dev data folder for the locations.
  // locations: [{"description": "Lummus Park Beach","type": "Point","coordinates": [-80.128473, 25.781842],"day": 1,"_id": "5c88fa8cf4afda39709c2959"},{...},{...},{...}]

  locations.forEach((loc) => {
    // 1) Creating the placeholder in the document to display the marker (pin)
    const el = document.createElement('div');
    el.className = 'marker';

    // 2) Add the marker to each location coordinates
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // 3) Add popup
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
