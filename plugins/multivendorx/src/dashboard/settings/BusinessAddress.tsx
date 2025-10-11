import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { getApiLink } from 'zyra';

declare global {
    interface Window {
        google: any;
    }
}

interface FormData {
    [key: string]: string;
}

const BusinessAddress = () => {
    const id = (window as any).appLocalizer?.store_id;
    const [formData, setFormData] = useState<FormData>({});
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [map, setMap] = useState<any>(null);
    const [marker, setMarker] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [googleLoaded, setGoogleLoaded] = useState<boolean>(false);
    const [mapboxLoaded, setMapboxLoaded] = useState<boolean>(false);
    const autocompleteInputRef = useRef<HTMLInputElement>(null);
    const [mapProvider, setMapProvider] = useState('');
    const [apiKey, setApiKey] = useState('');
    const appLocalizer = (window as any).appLocalizer;

    const [addressData, setAddressData] = useState({
        location_address: '',
        location_lat: '',
        location_lng: '',
        address: '',
        city: '',
        state: '',
        country: '',
        zip: '',
        timezone: ''
    });

    // Get REST API base URL
    useEffect(() => {
        if (appLocalizer) {
            setMapProvider(appLocalizer.map_providor);
            if (appLocalizer.map_providor === 'google_map_set') {
                setApiKey(appLocalizer.google_api_key);
            } else {
                setApiKey(appLocalizer.mapbox_api_key);
            }
        }
    }, []);

    // Load initial data
    useEffect(() => {
        if (!id) {
            console.error('No store ID found');
            setErrorMsg('No store ID available');
            setLoading(false);
            return;
        }

        const loadStoreData = async () => {
            try {
                const endpoint = getApiLink(appLocalizer, `geolocation/store/${id}`);
                console.log('Fetching from endpoint:', endpoint);

                const res = await axios.get(endpoint, {
                    headers: {
                        'X-WP-Nonce': appLocalizer.nonce
                    }
                });
                
                console.log('Store data loaded successfully:', res.data);
                const data = res.data || {};

                // Use the same structure as admin side
                const formattedData = {
                    location_address: data.location_address || data.address || '',
                    location_lat: data.location_lat || '',
                    location_lng: data.location_lng || '',
                    address: data.address || data.location_address || '',
                    city: data.city || '',
                    state: data.state || '',
                    country: data.country || '',
                    zip: data.zip || '',
                    timezone: data.timezone || ''
                };

                setAddressData(formattedData);
                setLoading(false);
            } catch (error: any) {
                console.error('Error loading store data:', error);
                setErrorMsg('Failed to load store data');
                setLoading(false);
                // Initialize with empty structure
                setAddressData({
                    location_address: '',
                    location_lat: '',
                    location_lng: '',
                    address: '',
                    city: '',
                    state: '',
                    country: '',
                    zip: '',
                    timezone: ''
                });
            }
        };

        loadStoreData();
    }, [id]);

    // Load map scripts based on provider
    useEffect(() => {
        if (mapProvider === 'google_map_set' && !googleLoaded) {
            loadGoogleMapsScript();
        } else if (mapProvider === 'mapbox_api_set' && !mapboxLoaded) {
            loadMapboxScript();
        }
    }, [mapProvider, googleLoaded, mapboxLoaded]);

    const loadMapboxScript = () => {
        const mapboxGlScript = document.createElement('script');
        mapboxGlScript.src = 'https://api.mapbox.com/mapbox-gl-js/v2.6.1/mapbox-gl.js';
        mapboxGlScript.async = true;
        document.head.appendChild(mapboxGlScript);

        const mapboxGlCss = document.createElement('link');
        mapboxGlCss.href = 'https://api.mapbox.com/mapbox-gl-js/v2.6.1/mapbox-gl.css';
        mapboxGlCss.rel = 'stylesheet';
        document.head.appendChild(mapboxGlCss);

        const mapboxGeocoderScript = document.createElement('script');
        mapboxGeocoderScript.src = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v4.7.2/mapbox-gl-geocoder.min.js';
        mapboxGeocoderScript.async = true;
        document.head.appendChild(mapboxGeocoderScript);

        const mapboxGeocoderCss = document.createElement('link');
        mapboxGeocoderCss.href = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v4.7.2/mapbox-gl-geocoder.css';
        mapboxGeocoderCss.rel = 'stylesheet';
        document.head.appendChild(mapboxGeocoderCss);

        mapboxGlScript.onload = () => {
            setMapboxLoaded(true);
        };

        mapboxGlScript.onerror = (error) => {
            setErrorMsg('Failed to load Mapbox. Please check your internet connection.');
        };
    };

    const loadGoogleMapsScript = () => {
        if (window.google) {
            setGoogleLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            setGoogleLoaded(true);
        };

        script.onerror = (error) => {
            setErrorMsg('Failed to load Google Maps. Please check your internet connection.');
        };

        document.head.appendChild(script);
    };

    useEffect(() => {
        if (!loading && mapProvider) {
            if (mapProvider === 'google_map_set' && googleLoaded) {
                initializeGoogleMap();
            } else if (mapProvider === 'mapbox_api_set' && mapboxLoaded) {
                initializeMapboxMap();
            }
        }
    }, [loading, mapProvider, googleLoaded, mapboxLoaded, formData]);

    const initializeGoogleMap = () => {
        if (!window.google || !autocompleteInputRef.current) return;

        const initialLat = parseFloat(formData.location_lat) || 40.7128;
        const initialLng = parseFloat(formData.location_lng) || -74.0060;

        const mapInstance = new window.google.maps.Map(document.getElementById('location-map'), {
            center: { lat: initialLat, lng: initialLng },
            zoom: formData.location_lat ? 15 : 10,
        });

        const markerInstance = new window.google.maps.Marker({
            map: mapInstance,
            draggable: true,
            position: { lat: initialLat, lng: initialLng },
        });

        markerInstance.addListener('dragend', () => {
            const position = markerInstance.getPosition();
            reverseGeocode('google', position.lat(), position.lng());
        });

        mapInstance.addListener('click', (event: any) => {
            reverseGeocode('google', event.latLng.lat(), event.latLng.lng());
        });

        const autocomplete = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
            types: ['establishment', 'geocode'],
            fields: ['address_components', 'formatted_address', 'geometry', 'name'],
        });

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry) {
                handlePlaceSelect(place, 'google');
            }
        });

        setMap(mapInstance);
        setMarker(markerInstance);
    };

    const initializeMapboxMap = () => {
        if (!(window as any).mapboxgl || !autocompleteInputRef.current) return;
    
        const geocoderContainer = document.getElementById('location-autocomplete-container');
        if (geocoderContainer) {
            geocoderContainer.innerHTML = '';
        }
        (window as any).mapboxgl.accessToken = apiKey;

        const initialLat = parseFloat(formData.location_lat) || 40.7128;
        const initialLng = parseFloat(formData.location_lng) || -74.0060;

        const mapInstance = new (window as any).mapboxgl.Map({
            container: 'location-map',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [initialLng, initialLat],
            zoom: formData.location_lat ? 15 : 10,
        });

        const markerInstance = new (window as any).mapboxgl.Marker({ draggable: true })
            .setLngLat([initialLng, initialLat])
            .addTo(mapInstance);

        markerInstance.on('dragend', () => {
            const lngLat = markerInstance.getLngLat();
            reverseGeocode('mapbox', lngLat.lat, lngLat.lng);
        });

        mapInstance.on('click', (event: any) => {
            reverseGeocode('mapbox', event.lngLat.lat, event.lngLat.lng);
        });

        const geocoder = new (window as any).MapboxGeocoder({
            accessToken: apiKey,
            mapboxgl: (window as any).mapboxgl,
            marker: false,
        });

        geocoder.on('result', (e: any) => {
            handlePlaceSelect(e.result, 'mapbox');
        });

        if (geocoderContainer) {
            geocoderContainer.appendChild(geocoder.onAdd(mapInstance));
            if (autocompleteInputRef.current) {
                autocompleteInputRef.current.style.display = 'none';
            }
        }

        setMap(mapInstance);
        setMarker(markerInstance);
    };

    const handlePlaceSelect = (place: any, provider: 'google' | 'mapbox') => {
        let lat, lng, formatted_address, addressComponents;

        if (provider === 'google') {
            const location = place.geometry.location;
            lat = location.lat();
            lng = location.lng();
            formatted_address = place.formatted_address;
            addressComponents = extractAddressComponents(place, 'google');
        } else {
            lng = place.center[0];
            lat = place.center[1];
            formatted_address = place.place_name;
            addressComponents = extractAddressComponents(place, 'mapbox');
        }

        if (map && marker) {
            if (provider === 'google') {
                map.setCenter({ lat, lng });
                marker.setPosition({ lat, lng });
            } else {
                map.setCenter([lng, lat]);
                marker.setLngLat([lng, lat]);
            }
            map.setZoom(17);
        }

        const newAddressData = {
            location_address: formatted_address,
            location_lat: lat.toString(),
            location_lng: lng.toString(),
            ...addressComponents,
        };

        // Ensure both address fields are populated
        if (!newAddressData.address && formatted_address) {
            newAddressData.address = formatted_address;
        }

        setAddressData(newAddressData);
        autoSave(newAddressData);
    };

    const reverseGeocode = (provider: 'google' | 'mapbox', lat: number, lng: number) => {
        if (provider === 'google') {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
                if (status === 'OK' && results[0]) {
                    handlePlaceSelect(results[0], 'google');
                } else {
                    setErrorMsg('Failed to get address for this location');
                }
            });
        } else {
            fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${apiKey}`)
                .then(response => response.json())
                .then(data => {
                    if (data.features && data.features.length > 0) {
                        handlePlaceSelect(data.features[0], 'mapbox');
                    } else {
                        setErrorMsg('Failed to get address for this location');
                    }
                })
                .catch(() => setErrorMsg('Reverse geocoding request failed'));
        }
    };

    const extractAddressComponents = (place: any, provider: 'google' | 'mapbox') => {
        const components: any = {};

        if (provider === 'google') {
            if (place.address_components) {
                let streetNumber = '';
                let route = '';
                let streetAddress = '';

                place.address_components.forEach((component: any) => {
                    const types = component.types;
                    
                    if (types.includes('street_number')) {
                        streetNumber = component.long_name;
                    } else if (types.includes('route')) {
                        route = component.long_name;
                    } else if (types.includes('locality')) {
                        components.city = component.long_name;
                    } else if (types.includes('administrative_area_level_1')) {
                        components.state = component.short_name || component.long_name;
                    } else if (types.includes('country')) {
                        components.country = component.long_name;
                    } else if (types.includes('postal_code')) {
                        components.zip = component.long_name;
                    }
                });

                // Build street address (same logic as admin side)
                if (streetNumber && route) {
                    streetAddress = `${streetNumber} ${route}`;
                } else if (route) {
                    streetAddress = route;
                } else if (streetNumber) {
                    streetAddress = streetNumber;
                }

                components.address = streetAddress.trim();
            }
        } else {
            // Mapbox address extraction (same logic as admin side)
            if (place.properties) {
                components.address = place.properties.address || '';
            }
            
            if (place.context) {
                place.context.forEach((component: any) => {
                    const idParts = component.id.split('.');
                    const type = idParts[0];
                    
                    if (type === 'postcode') {
                        components.zip = component.text;
                    } else if (type === 'place') {
                        components.city = component.text;
                    } else if (type === 'region') {
                        components.state = component.text;
                    } else if (type === 'country') {
                        components.country = component.text;
                    }
                });
            }
        }

        return components;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newAddressData = {
            ...addressData,
            [name]: value
        };
        setAddressData(newAddressData);
        autoSave(newAddressData);
    };

    // Update your autoSave function:
    const autoSave = (updatedData: any) => {
        // Ensure both address fields are consistent (same as admin side)
        const saveData = {
            ...updatedData,
            location_address: updatedData.location_address || updatedData.address || '',
            address: updatedData.address || updatedData.location_address || ''
        };

        axios({
            method: 'PUT',
            url: getApiLink(appLocalizer, `store/${id}`),
            headers: { 'X-WP-Nonce': appLocalizer.nonce },
            data: saveData,
        }).then((res) => {
            if (res.data.success) {
                setSuccessMsg('Store saved successfully!');
            }
        }).catch((error) => {
            console.error('Save error:', error);
            setErrorMsg('Failed to save store data');
        });
    };

    if (loading) {
        return (
            <div className="card-wrapper">
                <div className="card-content">
                    <div>Loading store data...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="card-wrapper">
            <div className="card-content">
                <div className="card-title">Business Address & Location</div>

                {successMsg && (
                    <div className="success-message" style={{ color: 'green', marginBottom: '15px', padding: '10px', background: '#f0fff0', border: '1px solid green' }}>
                        {successMsg}
                    </div>
                )}

                {errorMsg && (
                    <div className="error-message" style={{ color: 'red', marginBottom: '15px', padding: '10px', background: '#fff0f0', border: '1px solid red' }}>
                        {errorMsg}
                    </div>
                )}

                <div className="form-group-wrapper">
                    <div className="form-group">
                        <label htmlFor="location-autocomplete">Search Location *</label>
                        <div id="location-autocomplete-container">
                            <input
                                ref={autocompleteInputRef}
                                id="location-autocomplete"
                                type="text"
                                className="setting-form-input"
                                placeholder="Start typing your business address..."
                                defaultValue={addressData.location_address}
                            />
                        </div>
                    </div>
                </div>

                {/* Address Field */}
                <div className="form-group-wrapper">
                    <div className="form-group">
                        <label htmlFor="location_address">Address *</label>
                        <input
                            type="text"
                            name="location_address"
                            value={addressData.location_address || ''}
                            className="setting-form-input"
                            onChange={handleChange}
                            placeholder="Street address"
                            required
                        />
                    </div>
                </div>

                {/* Address Components */}
                <div className="form-group-wrapper">
                    <div className="form-group">
                        <label htmlFor="city">City</label>
                        <input
                            type="text"
                            name="city"
                            value={addressData.city || ''}
                            className="setting-form-input"
                            onChange={handleChange}
                            placeholder="City"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="state">State</label>
                        <input
                            type="text"
                            name="state"
                            value={addressData.state || ''}
                            className="setting-form-input"
                            onChange={handleChange}
                            placeholder="State"
                        />
                    </div>
                </div>

                <div className="form-group-wrapper">
                    <div className="form-group">
                        <label htmlFor="country">Country</label>
                        <input
                            type="text"
                            name="country"
                            value={addressData.country || ''}
                            className="setting-form-input"
                            onChange={handleChange}
                            placeholder="Country"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="zip">Zip</label>
                        <input
                            type="text"
                            name="zip"
                            value={addressData.zip || ''}
                            className="setting-form-input"
                            onChange={handleChange}
                            placeholder="Zip code"
                        />
                    </div>
                </div>

                {/* Hidden coordinates */}
                <input type="hidden" name="location_lat" value={addressData.location_lat} />
                <input type="hidden" name="location_lng" value={addressData.location_lng} />
            </div>
        </div>
    );
};

export default BusinessAddress;