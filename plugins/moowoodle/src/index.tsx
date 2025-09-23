import { render } from '@wordpress/element';
import { BrowserRouter } from 'react-router-dom';
import App from './app';
import 'zyra/build/index.css';
/**
 * Import the stylesheet for the plugin.
 */

// Render the App component into the DOM
render(
    <BrowserRouter>
        <App />
    </BrowserRouter>,
    document.getElementById( 'admin-main-wrapper' )
);
