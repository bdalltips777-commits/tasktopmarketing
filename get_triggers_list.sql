SELECT 
    trigger_name,
    event_object_table AS table_name,
    action_statement AS definition
FROM information_schema.triggers
WHERE trigger_schema = 'public';
