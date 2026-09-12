import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tmynaetsfcvzcwmtfvck.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_8JPCdhEonTnrFqMl9i3J4Q_YFz4Fry-";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);