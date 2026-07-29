// India states / UTs → cities (district HQs + major towns).
// The city field is also free-typeable, so any place not listed can still be entered.
export const INDIAN_STATES: { state: string; cities: string[] }[] = [
  {
    state: 'Andhra Pradesh',
    cities: [
      'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Kakinada', 'Tirupati',
      'Anantapur', 'Kadapa', 'Vizianagaram', 'Eluru', 'Ongole', 'Nandyal', 'Machilipatnam', 'Adoni',
      'Tenali', 'Chittoor', 'Hindupur', 'Proddatur', 'Bhimavaram', 'Madanapalle', 'Guntakal', 'Dharmavaram',
      'Gudivada', 'Narasaraopet', 'Tadepalligudem', 'Tadpatri', 'Chilakaluripet', 'Srikakulam', 'Amaravati',
    ],
  },
  {
    state: 'Arunachal Pradesh',
    cities: ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro', 'Bomdila', 'Tezu', 'Along', 'Roing', 'Khonsa', 'Changlang', 'Namsai'],
  },
  {
    state: 'Assam',
    cities: [
      'Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon', 'Dhubri',
      'Diphu', 'North Lakhimpur', 'Karimganj', 'Sivasagar', 'Goalpara', 'Barpeta', 'Mangaldoi', 'Nalbari',
      'Hailakandi', 'Golaghat', 'Hojai', 'Kokrajhar', 'Morigaon', 'Dhemaji',
    ],
  },
  {
    state: 'Bihar',
    cities: [
      'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Arrah', 'Begusarai', 'Katihar',
      'Munger', 'Chhapra', 'Bettiah', 'Saharsa', 'Hajipur', 'Sasaram', 'Dehri', 'Siwan', 'Motihari',
      'Bihar Sharif', 'Nawada', 'Buxar', 'Kishanganj', 'Sitamarhi', 'Jamalpur', 'Jehanabad', 'Aurangabad',
      'Lakhisarai', 'Madhubani', 'Samastipur', 'Bhabua', 'Araria', 'Khagaria', 'Supaul', 'Banka',
    ],
  },
  {
    state: 'Chhattisgarh',
    cities: [
      'Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Jagdalpur', 'Raigarh', 'Ambikapur',
      'Dhamtari', 'Mahasamund', 'Kanker', 'Kawardha', 'Bhatapara', 'Champa', 'Janjgir', 'Dalli-Rajhara', 'Naila',
    ],
  },
  {
    state: 'Goa',
    cities: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Bicholim', 'Curchorem', 'Sanquelim', 'Cuncolim', 'Canacona', 'Valpoi', 'Pernem', 'Calangute', 'Candolim'],
  },
  {
    state: 'Gujarat',
    cities: [
      'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh', 'Anand',
      'Nadiad', 'Morbi', 'Surendranagar', 'Bharuch', 'Navsari', 'Vapi', 'Veraval', 'Porbandar', 'Godhra',
      'Bhuj', 'Gandhidham', 'Palanpur', 'Valsad', 'Patan', 'Mehsana', 'Amreli', 'Botad', 'Dahod', 'Jetpur',
      'Ankleshwar', 'Deesa', 'Himatnagar', 'Wadhwan', 'Kalol', 'Modasa',
    ],
  },
  {
    state: 'Haryana',
    cities: [
      'Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Hisar', 'Karnal', 'Rohtak', 'Yamunanagar', 'Sonipat',
      'Panchkula', 'Bhiwani', 'Sirsa', 'Bahadurgarh', 'Jind', 'Kaithal', 'Rewari', 'Palwal', 'Kurukshetra',
      'Fatehabad', 'Narnaul', 'Jhajjar', 'Charkhi Dadri', 'Nuh', 'Hansi', 'Thanesar',
    ],
  },
  {
    state: 'Himachal Pradesh',
    cities: [
      'Shimla', 'Manali', 'Dharamshala', 'Solan', 'Mandi', 'Kullu', 'Bilaspur', 'Hamirpur', 'Una', 'Nahan',
      'Chamba', 'Kangra', 'Palampur', 'Baddi', 'Nalagarh', 'Sundarnagar', 'Paonta Sahib', 'Keylong', 'Reckong Peo', 'Dalhousie',
    ],
  },
  {
    state: 'Jharkhand',
    cities: [
      'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh', 'Deoghar', 'Giridih', 'Ramgarh', 'Medininagar',
      'Phusro', 'Chaibasa', 'Dumka', 'Gumla', 'Sahibganj', 'Chatra', 'Koderma', 'Lohardaga', 'Pakur', 'Simdega', 'Jhumri Telaiya',
    ],
  },
  {
    state: 'Karnataka',
    cities: [
      'Bengaluru', 'Mysuru', 'Hubli', 'Dharwad', 'Mangaluru', 'Belagavi', 'Davanagere', 'Ballari', 'Vijayapura',
      'Shivamogga', 'Tumakuru', 'Raichur', 'Bidar', 'Hospet', 'Hassan', 'Gadag', 'Udupi', 'Kalaburagi', 'Chitradurga',
      'Kolar', 'Mandya', 'Chikkamagaluru', 'Bagalkot', 'Robertsonpet', 'Bhadravati', 'Chikkaballapur', 'Karwar',
      'Ranebennuru', 'Gangavati', 'Sirsi', 'Yadgir', 'Koppal', 'Chamarajanagar', 'Haveri', 'Madikeri',
    ],
  },
  {
    state: 'Kerala',
    cities: [
      'Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha', 'Palakkad',
      'Kottayam', 'Malappuram', 'Kasaragod', 'Pathanamthitta', 'Idukki', 'Wayanad', 'Ernakulam', 'Guruvayur',
      'Manjeri', 'Ponnani', 'Vatakara', 'Kanhangad', 'Taliparamba', 'Cherthala', 'Changanassery', 'Kayamkulam',
      'Nedumangad', 'Neyyattinkara', 'Perinthalmanna', 'Tirur', 'Ottapalam', 'Chalakudy',
    ],
  },
  {
    state: 'Madhya Pradesh',
    cities: [
      'Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa',
      'Katni', 'Singrauli', 'Burhanpur', 'Khandwa', 'Morena', 'Bhind', 'Chhindwara', 'Guna', 'Shivpuri',
      'Vidisha', 'Chhatarpur', 'Damoh', 'Mandsaur', 'Khargone', 'Neemuch', 'Pithampur', 'Hoshangabad', 'Itarsi',
      'Sehore', 'Betul', 'Seoni', 'Datia', 'Nagda', 'Dhar', 'Balaghat', 'Ashoknagar', 'Tikamgarh',
    ],
  },
  {
    state: 'Maharashtra',
    cities: [
      'Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Pimpri-Chinchwad', 'Kalyan-Dombivli', 'Vasai-Virar',
      'Aurangabad', 'Navi Mumbai', 'Solapur', 'Kolhapur', 'Amravati', 'Nanded', 'Sangli', 'Malegaon', 'Akola',
      'Latur', 'Dhule', 'Ahmednagar', 'Chandrapur', 'Parbhani', 'Jalgaon', 'Bhiwandi', 'Panvel', 'Satara',
      'Beed', 'Yavatmal', 'Osmanabad', 'Nandurbar', 'Wardha', 'Udgir', 'Hinganghat', 'Ichalkaranji', 'Miraj',
      'Baramati', 'Gondia', 'Ratnagiri', 'Ambernath', 'Ulhasnagar', 'Jalna', 'Bhusawal', 'Lonavala', 'Alibag',
    ],
  },
  {
    state: 'Manipur',
    cities: ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Kakching', 'Ukhrul', 'Senapati', 'Tamenglong', 'Chandel', 'Jiribam', 'Moreh'],
  },
  {
    state: 'Meghalaya',
    cities: ['Shillong', 'Tura', 'Jowai', 'Nongstoin', 'Williamnagar', 'Baghmara', 'Nongpoh', 'Mairang', 'Resubelpara', 'Cherrapunji'],
  },
  {
    state: 'Mizoram',
    cities: ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip', 'Kolasib', 'Saiha', 'Lawngtlai', 'Mamit', 'Khawzawl', 'Hnahthial'],
  },
  {
    state: 'Nagaland',
    cities: ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha', 'Zunheboto', 'Mon', 'Phek', 'Kiphire', 'Longleng', 'Peren'],
  },
  {
    state: 'Odisha',
    cities: [
      'Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Baripada', 'Bhadrak',
      'Jharsuguda', 'Jeypore', 'Bargarh', 'Rayagada', 'Bhawanipatna', 'Dhenkanal', 'Barbil', 'Kendrapara',
      'Paradip', 'Angul', 'Jajpur', 'Koraput', 'Nabarangpur', 'Phulbani', 'Sunabeda', 'Talcher', 'Keonjhar',
    ],
  },
  {
    state: 'Punjab',
    cities: [
      'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Hoshiarpur', 'Batala', 'Pathankot',
      'Moga', 'Abohar', 'Malerkotla', 'Khanna', 'Phagwara', 'Muktsar', 'Barnala', 'Rajpura', 'Firozpur',
      'Kapurthala', 'Sangrur', 'Fazilka', 'Gurdaspur', 'Kharar', 'Gobindgarh', 'Mansa', 'Faridkot', 'Nabha', 'Zirakpur',
    ],
  },
  {
    state: 'Rajasthan',
    cities: [
      'Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Bhilwara', 'Alwar', 'Sikar', 'Sri Ganganagar',
      'Pali', 'Bharatpur', 'Tonk', 'Beawar', 'Hanumangarh', 'Kishangarh', 'Sawai Madhopur', 'Churu', 'Jhunjhunu',
      'Barmer', 'Nagaur', 'Banswara', 'Dausa', 'Jaisalmer', 'Chittorgarh', 'Dhaulpur', 'Baran', 'Bundi',
      'Sujangarh', 'Makrana', 'Sardarshahar', 'Nokha', 'Fatehpur', 'Jhalawar', 'Dungarpur', 'Pratapgarh',
    ],
  },
  {
    state: 'Sikkim',
    cities: ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan', 'Rangpo', 'Singtam', 'Jorethang', 'Ravangla', 'Pelling', 'Soreng'],
  },
  {
    state: 'Tamil Nadu',
    cities: [
      'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Vellore',
      'Erode', 'Thoothukudi', 'Dindigul', 'Thanjavur', 'Ranipet', 'Sivakasi', 'Karur', 'Hosur', 'Nagercoil',
      'Kanchipuram', 'Kumbakonam', 'Cuddalore', 'Karaikudi', 'Neyveli', 'Nagapattinam', 'Viluppuram', 'Tiruvannamalai',
      'Pollachi', 'Rajapalayam', 'Pudukkottai', 'Namakkal', 'Krishnagiri', 'Dharmapuri', 'Ooty', 'Ambur',
      'Virudhunagar', 'Tenkasi', 'Ramanathapuram', 'Theni', 'Arakkonam', 'Mettur', 'Gudiyatham', 'Perambalur',
    ],
  },
  {
    state: 'Telangana',
    cities: [
      'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam', 'Mahbubnagar', 'Nalgonda',
      'Adilabad', 'Suryapet', 'Miryalaguda', 'Siddipet', 'Jagtial', 'Mancherial', 'Nirmal', 'Kamareddy',
      'Sangareddy', 'Medak', 'Wanaparthy', 'Bhongir', 'Vikarabad', 'Gadwal', 'Bodhan', 'Kothagudem', 'Secunderabad',
    ],
  },
  {
    state: 'Tripura',
    cities: ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailashahar', 'Belonia', 'Ambassa', 'Khowai', 'Teliamura', 'Sabroom', 'Sonamura', 'Amarpur'],
  },
  {
    state: 'Uttar Pradesh',
    cities: [
      'Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Meerut', 'Varanasi', 'Prayagraj', 'Noida', 'Bareilly',
      'Aligarh', 'Moradabad', 'Saharanpur', 'Gorakhpur', 'Firozabad', 'Jhansi', 'Muzaffarnagar', 'Mathura',
      'Rampur', 'Shahjahanpur', 'Farrukhabad', 'Ayodhya', 'Hapur', 'Etawah', 'Mirzapur', 'Bulandshahr',
      'Sambhal', 'Amroha', 'Hardoi', 'Fatehpur', 'Raebareli', 'Sitapur', 'Bahraich', 'Modinagar', 'Unnao',
      'Jaunpur', 'Lakhimpur', 'Hathras', 'Banda', 'Pilibhit', 'Barabanki', 'Khurja', 'Gonda', 'Mainpuri',
      'Deoria', 'Ghazipur', 'Sultanpur', 'Azamgarh', 'Bijnor', 'Basti', 'Greater Noida',
    ],
  },
  {
    state: 'Uttarakhand',
    cities: [
      'Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh', 'Nainital', 'Mussoorie',
      'Almora', 'Pithoragarh', 'Kotdwar', 'Ramnagar', 'Pauri', 'Srinagar', 'Bageshwar', 'Champawat', 'Tehri',
      'Uttarkashi', 'Chamoli', 'Ranikhet', 'Mangaluru',
    ],
  },
  {
    state: 'West Bengal',
    cities: [
      'Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda', 'Baharampur', 'Habra',
      'Kharagpur', 'Haldia', 'Krishnanagar', 'Medinipur', 'Jalpaiguri', 'Balurghat', 'Basirhat', 'Bankura',
      'Chakdaha', 'Darjeeling', 'Alipurduar', 'Purulia', 'Cooch Behar', 'Raiganj', 'Bongaon', 'Barasat',
      'Serampore', 'Nabadwip', 'Kalyani', 'Bansberia', 'Tamluk', 'Suri', 'Jhargram',
    ],
  },
  {
    state: 'Andaman & Nicobar',
    cities: ['Port Blair', 'Diglipur', 'Mayabunder', 'Rangat', 'Car Nicobar', 'Havelock', 'Neil Island', 'Campbell Bay'],
  },
  {
    state: 'Chandigarh',
    cities: ['Chandigarh', 'Manimajra'],
  },
  {
    state: 'Dadra & Nagar Haveli and Daman & Diu',
    cities: ['Daman', 'Silvassa', 'Diu', 'Amli', 'Nani Daman', 'Moti Daman'],
  },
  {
    state: 'Delhi',
    cities: [
      'New Delhi', 'Delhi', 'Dwarka', 'Rohini', 'Saket', 'Pitampura', 'Janakpuri', 'Karol Bagh', 'Laxmi Nagar',
      'Connaught Place', 'Vasant Kunj', 'Mayur Vihar', 'Preet Vihar', 'Najafgarh', 'Narela', 'Nangloi',
      'Shahdara', 'Okhla', 'Chanakyapuri', 'Hauz Khas', 'Lajpat Nagar', 'Greater Kailash', 'Rajouri Garden',
    ],
  },
  {
    state: 'Jammu & Kashmir',
    cities: [
      'Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Sopore', 'Kathua', 'Udhampur', 'Bandipora', 'Kupwara',
      'Pulwama', 'Budgam', 'Ganderbal', 'Rajouri', 'Poonch', 'Kishtwar', 'Doda', 'Ramban', 'Samba', 'Reasi', 'Kulgam', 'Shopian',
    ],
  },
  {
    state: 'Ladakh',
    cities: ['Leh', 'Kargil', 'Nubra', 'Zanskar', 'Drass', 'Diskit', 'Khaltse'],
  },
  {
    state: 'Lakshadweep',
    cities: ['Kavaratti', 'Agatti', 'Amini', 'Andrott', 'Minicoy', 'Kalpeni', 'Kadmat'],
  },
  {
    state: 'Puducherry',
    cities: ['Puducherry', 'Karaikal', 'Yanam', 'Mahe', 'Ozhukarai', 'Villianur', 'Ariyankuppam'],
  },
]
