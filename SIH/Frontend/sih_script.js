document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const API_BASE_URL = 'http://127.0.0.1:8000';
    const LOOKUP_MIN_CHARS = 3;

    // --- Element References ---
    const lookupInput = document.getElementById('lookup-input');
    const lookupResults = document.getElementById('lookup-results');
    const translateInput = document.getElementById('translate-input');
    const translateBtn = document.getElementById('translate-btn');
    const translateResult = document.getElementById('translate-result');

    // --- Helper function to display messages ---
    const displayMessage = (element, text, type = 'message') => {
        element.innerHTML = `<p class="${type}">${text}</p>`;
    };

    // --- Lookup Functionality ---
    const handleLookup = async () => {
        const query = lookupInput.value.trim();

        if (query.length < LOOKUP_MIN_CHARS) {
            lookupResults.innerHTML = ''; // Clear results if query is too short
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/lookup?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }
            const data = await response.json();

            if (data.length === 0) {
                displayMessage(lookupResults, 'No matching terms found.');
            } else {
                lookupResults.innerHTML = data.map(item => `
                    <div class="result-item">
                        <strong>${item.NAMASTE_Term}</strong> (NAMASTE: ${item.NAMASTE_Code}) 
                        &harr; 
                        <strong>${item.ICD11_Term}</strong> (ICD-11: ${item.ICD11_Code})
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Lookup failed:', error);
            displayMessage(lookupResults, 'Failed to fetch data. Is the backend server running?', 'error-message');
        }
    };

    // --- (Optional) Updated Translate Functionality for a nicer display ---
    const handleTranslate = async () => {
        const code = translateInput.value.trim();

        if (!code) {
            displayMessage(translateResult, 'Please enter a code to translate.');
            return;
        }

        displayMessage(translateResult, 'Translating...');

        try {
            const response = await fetch(`${API_BASE_URL}/translate?code=${encodeURIComponent(code)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Translation failed.');
            }
            
            // --- MODIFICATION START ---
            // Instead of showing the raw JSON, format it into a nice result.
            const resultHtml = `
                <div class="result-item">
                    Input: <strong>${data.input_code}</strong> (System: ${data.input_system})
                    <br>
                    Translation: <strong>${data.translation.term}</strong> (System: ${data.translation.system}, Code: ${data.translation.code})
                </div>
            `;
            translateResult.innerHTML = resultHtml;
            // --- MODIFICATION END ---

        } catch (error) {
            console.error('Translate failed:', error);
            displayMessage(translateResult, `Error: ${error.message}`, 'error-message');
        }
    };

    // --- Event Listeners ---
    lookupInput.addEventListener('keyup', handleLookup);
    translateBtn.addEventListener('click', handleTranslate);
    
    // Allow pressing Enter in the translate input field
    translateInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            handleTranslate();
        }
    });

    // --- Initial Message ---
    displayMessage(lookupResults, 'Results will appear here.');
    displayMessage(translateResult, 'Translation will appear here.');
});