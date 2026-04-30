import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nyphvbfgwksdgamvopvh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cGh2YmZnd2tzZGdhbXZvcHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTQ4OTUsImV4cCI6MjA5MzA3MDg5NX0.KngTtAblHE5mw9QF13P3EI-1jyK-ozJMUJplrOXg4ZM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
