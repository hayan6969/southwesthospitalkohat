export const PAKISTAN_PROVINCES: Record<string, string[]> = {
  "Punjab": [
    "Lahore", "Faisalabad", "Rawalpindi", "Multan", "Gujranwala",
    "Sialkot", "Bahawalpur", "Sargodha", "Sahiwal", "Jhang",
    "Rahim Yar Khan", "Sheikhupura", "Gujrat", "Kasur",
    "Dera Ghazi Khan", "Jhelum", "Mianwali", "Chiniot",
    "Okara", "Hafizabad", "Muzaffargarh", "Khanewal",
    "Vehari", "Lodhran", "Toba Tek Singh", "Pakpattan",
    "Narowal", "Chakwal", "Attock", "Bhakkar", "Layyah",
    "Rajanpur", "Khushab", "Nankana Sahib", "Mandi Bahauddin",
    "Bahawalnagar", "Burewala", "Kamoke", "Wazirabad",
    "Taxila", "Muridke", "Sadiqabad", "Chishtian",
    "Ahmadpur East", "Jaranwala", "Kot Addu", "Samundri",
    "Daska", "Haroonabad", "Kamalia", "Pattoki", "Arifwala"
  ],
  "Sindh": [
    "Karachi", "Hyderabad", "Sukkur", "Larkana", "Nawabshah",
    "Mirpur Khas", "Jacobabad", "Shikarpur", "Khairpur",
    "Dadu", "Thatta", "Badin", "Tando Adam", "Tando Allahyar",
    "Umerkot", "Sanghar", "Ghotki", "Matiari", "Tharparkar",
    "Kashmore", "Jamshoro", "Korangi", "Malir", "Gulshan-e-Iqbal",
    "North Nazimabad", "Clifton", "Saddar", "Kemari"
  ],
  "Khyber Pakhtunkhwa": [
    "Peshawar", "Abbottabad", "Mardan", "Swat", "Mansehra",
    "Kohat", "Dera Ismail Khan", "Charsadda", "Nowshera",
    "Swabi", "Bannu", "Haripur", "Lakki Marwat", "Tank",
    "Batagram", "Hangu", "Buner", "Shangla", "Lower Dir",
    "Upper Dir", "Chitral", "Karak", "Malakand", "Torghar",
    "Kohistan", "Kolai-Pallas"
  ],
  "Balochistan": [
    "Quetta", "Gwadar", "Turbat", "Khuzdar", "Hub",
    "Chaman", "Sibi", "Zhob", "Dera Murad Jamali",
    "Loralai", "Kalat", "Nushki", "Mastung", "Pishin",
    "Ziarat", "Panjgur", "Lasbela", "Awaran", "Jhal Magsi",
    "Bolan", "Musakhel", "Sherani", "Washuk", "Kech"
  ],
  "Islamabad Capital Territory": [
    "Islamabad"
  ],
  "Azad Jammu & Kashmir": [
    "Muzaffarabad", "Mirpur", "Rawalakot", "Bagh", "Kotli",
    "Bhimber", "Pallandri", "Hattian Bala", "Haveli", "Neelum"
  ],
  "Gilgit-Baltistan": [
    "Gilgit", "Skardu", "Hunza", "Nagar", "Ghizer",
    "Astore", "Diamer", "Ghanche", "Shigar", "Kharmang"
  ]
};

export const ALL_PROVINCES = Object.keys(PAKISTAN_PROVINCES);

export const getCitiesForProvince = (province: string): string[] => {
  return PAKISTAN_PROVINCES[province] || [];
};
