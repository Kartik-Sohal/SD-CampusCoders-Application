// functions/sync-user-profile.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

exports.handler = async (event, context) => {
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("SYNC-USER: Supabase config missing.");
        return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error." }) };
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    const { user } = context.clientContext; // User comes from JWT sent by client

    if (!user || !user.sub) {
        console.warn("SYNC-USER: Unauthorized - No user.sub in JWT context from client.");
        return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized: User identification failed." }) };
    }

    const userId = user.sub;
    const userEmail = user.email;
    const userFullName = user.user_metadata?.full_name || null;
    const userAvatarUrl = user.user_metadata?.avatar_url || null;
    const userNetlifyRoles = user.app_metadata?.roles || [];

    console.log(`SYNC-USER: Processing for User ID: ${userId}, Email: ${userEmail}`);

    try {
        const { data: upsertedUser, error: upsertError } = await supabase
            .from('users') // public.users table
            .upsert(
                {
                    id: userId,
                    email: userEmail,
                    full_name: userFullName,
                    avatar_url: userAvatarUrl,
                    roles: userNetlifyRoles,
                    updated_at: new Date().toISOString()
                    // created_at will be set by DB default if user is new
                },
                {
                    onConflict: 'id', 
                }
            )
            .select()
            .single();

        if (upsertError) {
            console.error(`SYNC-USER: Supabase error upserting user ${userId}:`, upsertError);
            return { statusCode: 500, body: JSON.stringify({ error: "Failed to synchronize user profile." }) };
        }

        console.log(`SYNC-USER: User ${userId} successfully synchronized with public.users. Data:`, upsertedUser);
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "User profile synchronized.", user: upsertedUser }),
        };

    } catch (error) {
        console.error(`SYNC-USER: Unexpected error for user ${userId}:`, error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal server error during profile synchronization." }) };
    }
};