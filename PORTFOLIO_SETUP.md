# Salon portfolio setup

The public portfolio and its separate admin page use Supabase for shared photo storage and sign-in. Until configured, visitors see a friendly setup message and the admin page does not display a login form.

## 1. Create and configure Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com/).
2. In the Supabase SQL Editor, run the contents of `supabase-portfolio.sql`.
3. In **Project Settings → API Keys**, copy the **Project URL** and **publishable key** (or legacy anon key) into `supabase-config.js`:

   ```js
   window.NGOZI_SUPABASE_CONFIG = {
     url: "https://your-project-id.supabase.co",
     anonKey: "your-public-anon-key"
   };
   ```

   The publishable/anon key is intended for browser use; the database and storage policies in the SQL file restrict writes. **Never add a secret key, service-role key, account password, or other secret to this website.**

## 2. Set up the owner sign-in

1. In Supabase, open **Authentication → URL Configuration**. Set the **Site URL** to `https://dalord2.github.io/ngozibraidsandbeautysupply/` and add `https://dalord2.github.io/ngozibraidsandbeautysupply/**` to **Redirect URLs**. The password-reset flow returns to the public `admin.html` page. For local testing, add `http://127.0.0.1:8765/**` as an additional redirect URL; do not use the local IP as the deployed **Site URL**.
2. Open **Authentication → Users** and send an invitation to the salon owner. Public sign-up is not provided by this site.
3. Copy the invited user's UUID and run this statement in the SQL Editor, replacing the example UUID:

   ```sql
   insert into public.portfolio_admins (user_id)
   values ('00000000-0000-0000-0000-000000000000');
   ```

4. Open `admin.html`, accept the invitation, and sign in with that email and the password you set. If you need a password, choose **Forgot your password?** on the admin page and follow the reset link.
5. Choose a JPG, PNG, or WebP image up to 8 MB, add a short style description, and upload it. The photo will appear in the public portfolio on the home page. Admins can remove published photos there as well.

## Photo and privacy notes

- Upload only photos that the client has given permission to publish. Avoid captions with personal or sensitive information.
- Images in the `hair-portfolio` bucket are publicly viewable so visitors can see the portfolio; only an authorized portfolio admin can upload or delete them.
- If an upload, sign-in, or gallery load fails, the page displays an error. Check the Supabase project settings and SQL policies before retrying.
