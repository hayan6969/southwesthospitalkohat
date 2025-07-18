-- Generate doctor accounts with random passwords and specializations
DO $$
DECLARE
    doctor_data RECORD;
    generated_password TEXT;
    new_user_id UUID;
    doctors_info TEXT[][] := ARRAY[
        ['dr-khalil-asad@healthways.com', 'Dr.', 'Khalil', 'Asad', 'ENT Surgeon', 'abc123xy'],
        ['dr-waseem-muhammad@healthways.com', 'Dr.', 'Waseem', 'Muhammad', 'General & Laparoscopic Surgeon', 'def456zw'],
        ['dr-sajid-hanif@healthways.com', 'Dr.', 'Sajid', 'Hanif', 'Children Specialist', 'ghi789uv'],
        ['dr-sarfaraz-khan-khattak@healthways.com', 'Dr.', 'Sarfaraz Khan', 'Khattak', 'Neuro Surgeon', 'jkl012st'],
        ['dr-heema-mujeeb@healthways.com', 'Dr.', 'Heema', 'Mujeeb', 'Gynecologist', 'mno345qr'],
        ['dr-syed-asim-ali-shah@healthways.com', 'Dr.', 'Syed Asim Ali', 'Shah', 'Eye Surgeon', 'pqr678op'],
        ['dr-fouzia-shahid@healthways.com', 'Dr.', 'Fouzia', 'Shahid', 'Gynecologist', 'stu901mn'],
        ['dr-muhammad-anwar@healthways.com', 'Dr.', 'Muhammad', 'Anwar', 'Dental Surgeon', 'vwx234kl'],
        ['dr-jaffar-raza@healthways.com', 'Dr.', 'Jaffar', 'Raza', 'Dental Surgeon', 'yza567ij'],
        ['dr-aimal-khan@healthways.com', 'Dr.', 'Aimal', 'Khan', 'Anesthetist & Intensivist', 'bcd890gh'],
        ['dr-khaizran-saif@healthways.com', 'Dr.', 'Khaizran', 'Saif', 'Ultra Sound Specialist', 'efg123ef'],
        ['dr-muhammad-awais@healthways.com', 'Dr.', 'Muhammad', 'Awais', 'Children Specialist', 'hij456cd'],
        ['dr-bushra-shabir@healthways.com', 'Dr.', 'Bushra', 'Shabir', 'Physiotherapist', 'klm789ab'],
        ['dr-nayab-zahoor@healthways.com', 'Dr.', 'Nayab', 'Zahoor', 'Clinical Psychologist', 'nop012za'],
        ['dr-aziza-majid@healthways.com', 'Dr.', 'Aziza', 'Majid', 'Doctor of Pharmacy', 'qrs345yx'],
        ['dr-shoaib-hameed@healthways.com', 'Dr.', 'Shoaib', 'Hameed', 'Psychiatrist', 'tuv678wx'],
        ['dr-kashif-kamal@healthways.com', 'Dr.', 'Kashif', 'Kamal', 'Skin Specialist', 'wxy901uv'],
        ['dr-faheem-anwar@healthways.com', 'Dr.', 'Faheem', 'Anwar', 'Medical Specialist', 'zab234st']
    ];
BEGIN
    FOR i IN 1..array_length(doctors_info, 1) LOOP
        -- Create user account
        SELECT public.create_user_account(
            doctors_info[i][1], -- email
            doctors_info[i][6], -- password
            doctors_info[i][3], -- first_name
            doctors_info[i][4], -- last_name  
            'doctor'            -- role
        ) INTO new_user_id;
        
        -- Update the profile role to doctor (in case it wasn't set correctly)
        UPDATE public.profiles 
        SET role = 'doctor'
        WHERE id = new_user_id;
        
        -- Insert into doctors table with specialization
        INSERT INTO public.doctors (
            id,
            specialization,
            experience_years,
            consultation_fee,
            license_number
        ) VALUES (
            new_user_id,
            doctors_info[i][5], -- specialization
            5, -- default experience years
            3000, -- default consultation fee (PKR 3000)
            'LIC-' || UPPER(SUBSTRING(MD5(new_user_id::text), 1, 8)) -- generate license number
        );
        
        RAISE NOTICE 'Created doctor account: % with password: %', doctors_info[i][1], doctors_info[i][6];
    END LOOP;
END $$;