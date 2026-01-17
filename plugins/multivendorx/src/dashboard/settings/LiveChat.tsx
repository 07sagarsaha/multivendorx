import {
	useState,
	useEffect,
	JSXElementConstructor,
	Key,
	ReactElement,
	ReactNode,
	ReactPortal,
} from 'react';
import { BasicInput, TextArea, FileInput, SelectInput, getApiLink } from 'zyra';
import axios from 'axios';
import { __ } from '@wordpress/i18n';

const LiveChat = () => {
	const [chatPreferences, setChatPreferences] = useState({
		preferred_chat: 'talkjs',
		facebook_user_id: '',
		whatsapp_number: '',
		talkjs_app_id: '',
		talkjs_secret_key: '',
	});

	useEffect(() => {
		loadChatPreferences();

		// Initialize TalkJS for the vendor side
		Talk.ready
			.then(function () {
				if (!chatPreferences.talkjs_app_id || !chatPreferences.talkjs_secret_key) {
					console.warn("TalkJS App ID or Secret Key is not configured. Live Chat will not function.");
					return;
				}

				const currentUser = window.wp.data.select('core').getCurrentUser(); // Assuming currentUser is available globally
				const vendorId = currentUser ? String(currentUser.id) : 'vendor-guest';
				const vendorName = currentUser ? currentUser.name : 'Vendor Guest';
				const vendorEmail = currentUser ? currentUser.email : null;

				const me = new Talk.User({
					id: vendorId,
					name: vendorName,
					email: vendorEmail ? [vendorEmail] : null,
					role: 'vendor', // Assign 'vendor' role
				});

				const talkSession = new Talk.Session({
					appId: chatPreferences.talkjs_app_id,
					me: me,
				});

				const inbox = talkSession.createInbox();
				inbox.mount(document.getElementById('talkjs-container'));
			})
			.catch(function (e) {
				console.error("TalkJS failed to load or initialize on vendor side:", e);
			});
	}, [chatPreferences.talkjs_app_id, chatPreferences.talkjs_secret_key]); // Re-run effect if these change

	    const loadChatPreferences = async () => {
	        try {
	            const response = await axios.get(
	                getApiLink(appLocalizer, 'chat-preferences'), 
	                {
	                    headers: { 'X-WP-Nonce': appLocalizer.nonce },
	                }
	            );
	            if (response.data.success) {
	                setChatPreferences(response.data.data);
	            }
	        } catch (error) {
	            console.error('Error loading chat preferences:', error);
	        }
	    };

    const saveChatPreferences = async () => {
        try {
            // TODO: Replace with the actual API link for saving preferences
            const response = await axios.post(
                getApiLink(appLocalizer, 'chat-preferences'), // Updated endpoint
                chatPreferences,
                {
                    headers: {
                        'X-WP-Nonce': appLocalizer.nonce,
                        'Content-Type': 'application/json',
                    },
                }
            );
            if (response.data.success) {
                alert('Chat preferences saved successfully!');
            }
        } catch (error) {
            console.error('Error saving chat preferences:', error);
            alert('Failed to save chat preferences.');
        }
    };

	return (
		<div className="multivendorx-livechat-admin">
            <div className="chat-preferences-section">
                <h2>{__('Chat Preferences', 'multivendorx')}</h2>
                <SelectInput
                    label={__('Preferred Chat Provider', 'multivendorx')}
                    value={chatPreferences.preferred_chat}
                    onChange={(e) =>
                        setChatPreferences({
                            ...chatPreferences,
                            preferred_chat: e.target.value,
                        })
                    }
                    options={[
                        { label: 'TalkJS', value: 'talkjs' },
                        { label: 'Facebook Messenger', value: 'facebook' },
                        { label: 'WhatsApp', value: 'whatsapp' },
                    ]}
                />
                {chatPreferences.preferred_chat === 'talkjs' && (
                    <>
                        <BasicInput
                            label={__('TalkJS App ID', 'multivendorx')}
                            value={chatPreferences.talkjs_app_id}
                            onChange={(e) =>
                                setChatPreferences({
                                    ...chatPreferences,
                                    talkjs_app_id: e.target.value,
                                })
                            }
                            placeholder="Enter your TalkJS App ID"
                        />
                        <BasicInput
                            label={__('TalkJS Secret Key', 'multivendorx')}
                            value={chatPreferences.talkjs_secret_key}
                            onChange={(e) =>
                                setChatPreferences({
                                    ...chatPreferences,
                                    talkjs_secret_key: e.target.value,
                                })
                            }
                            placeholder="Enter your TalkJS Secret Key"
                            type="password" // Mask the input for security
                        />
                    </>
                )}
                {chatPreferences.preferred_chat === 'facebook' && (
                    <BasicInput
                        label={__('Facebook User ID', 'multivendorx')}
                        value={chatPreferences.facebook_user_id}
                        onChange={(e) =>
                            setChatPreferences({
                                ...chatPreferences,
                                facebook_user_id: e.target.value,
                            })
                        }
                        placeholder="Enter your Facebook User ID"
                    />
                )}
                {chatPreferences.preferred_chat === 'whatsapp' && (
                    <BasicInput
                        label={__('WhatsApp Number', 'multivendorx')}
                        value={chatPreferences.whatsapp_number}
                        onChange={(e) =>
                            setChatPreferences({
                                ...chatPreferences,
                                whatsapp_number: e.target.value,
                            })
                        }
                        placeholder="Enter your WhatsApp Number (e.g., +1234567890)"
                    />
                )}
                <button onClick={saveChatPreferences} className="button button-primary">
                    {__('Save Changes', 'multivendorx')}
                </button>
            </div>

            <div className="talkjs-inbox-section">
                <h2>{__('TalkJS Conversations', 'multivendorx')}</h2>
                <div id="talkjs-container" style={{ height: '500px' }}>
                    Loading chat...
                </div>
            </div>
		</div>
	);
};

export default LiveChat;
