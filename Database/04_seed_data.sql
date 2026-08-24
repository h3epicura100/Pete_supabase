-- SEED INITIAL USERS (System Logins)
INSERT INTO public.pete_users (name, username, password, role, pages)
VALUES
    ('Sonia', 'Sonia', 'S121', 'counter', ARRAY['dashboard','add entry','receive entry','reports']),
    ('Admin', 'admin', 'admin123', 'admin', ARRAY['dashboard','add entry','receive entry','reports','master','settings']),
    ('User1', 'User1', 'U2025', 'compunder', ARRAY['receive entry']),
    ('Naresh', 'Naresh', 'N121', 'counter', ARRAY['dashboard','add entry','reports','receive entry'])
ON CONFLICT (username) DO NOTHING;

-- SEED UNIFIED DROPDOWN MASTER TABLE (public.pete_master)
INSERT INTO public.pete_master (category, value)
VALUES
    -- PERSONS
    ('person', 'Sonia'),
    ('person', 'Naresh'),
    ('person', 'Admin'),
    ('person', 'User1'),

    -- MODES
    ('mode', 'Cash'),
    ('mode', 'Bank'),
    ('mode', 'Credit'),

    -- GROUP HEADS
    ('group_head', 'Client Collection'),
    ('group_head', 'Staff & Labor Costs'),
    ('group_head', 'Purchase'),
    ('group_head', 'Bhel wala advance'),
    ('group_head', 'Software purchase satendra'),
    ('group_head', 'Kitchen & Cooking Supplies'),
    ('group_head', 'Miscellaneous'),
    ('group_head', 'New Test'),
    ('group_head', 'Others'),
    ('group_head', 'Honda disel'),
    ('group_head', 'Saku dental'),
    ('group_head', 'Ayarveer birthday'),
    ('group_head', 'Ahmedabad'),
    ('group_head', 'Auto system'),
    ('group_head', 'Home'),

    -- REASONS
    ('reason', 'Amma Treatment'),
    ('reason', 'Whatsup api'),
    ('reason', '15-20 April Udaipur'),
    ('reason', 'Shyam Agarwal'),
    ('reason', 'Ashish salary'),
    ('reason', 'Chotu'),
    ('reason', 'Kuldeep loding'),
    ('reason', 'Prateek comms'),
    ('reason', 'Pani tanker'),
    ('reason', 'Rohit salary'),
    ('reason', 'Punjabi'),
    ('reason', 'Santosh auto'),
    ('reason', 'Rajkumar Nishad'),
    ('reason', 'Rashmi group lol'),
    ('reason', 'Idli'),
    ('reason', 'Home rasan'),
    ('reason', 'Demo Test'),

    -- VENDORS
    ('vendor', 'Aanand Dairy'),
    ('vendor', 'Akf veg'),
    ('vendor', 'Cake@ Bake'),
    ('vendor', 'Anwantari Medical Centre'),
    ('vendor', 'Gokul Super Store'),
    ('vendor', 'Gudiyari Store'),
    ('vendor', 'H3'),
    ('vendor', 'Honey Fruit'),
    ('vendor', 'Instadryclean'),
    ('vendor', 'Jain Disposable'),
    ('vendor', 'Lalwani Store'),
    ('vendor', 'Petrol Pump'),
    ('vendor', 'Raipur Ice'),
    ('vendor', 'Santosh Provision'),
    ('vendor', 'Sg Fuel'),
    ('vendor', 'Vachan'),
    ('vendor', 'Vinod Hardware'),
    ('vendor', 'Welding')
ON CONFLICT (category, value) DO NOTHING;
