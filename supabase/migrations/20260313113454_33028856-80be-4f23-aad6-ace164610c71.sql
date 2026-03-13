
-- Fix Mar 13 closing: hospital_revenue should be 10500 - 9000 = 1500 (exclude consultations)
UPDATE daily_closings 
SET hospital_revenue = hospital_revenue - 9000,
    net_profit = net_profit - 9000
WHERE id = '35b09933-176b-45e2-8516-1355eead755e';

-- Fix Mar 12 closing: hospital_revenue should be 6000 - 6000 = 0 (all were consultations)
UPDATE daily_closings 
SET hospital_revenue = hospital_revenue - 6000,
    net_profit = net_profit - 6000
WHERE id = '5bb8c458-7d42-4c8f-be2e-84af8970ba61';
