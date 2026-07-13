import prisma from '../config/prisma.js'

async function main() {
  console.log('Clearing old data...')
  await prisma.package.deleteMany({})
  await prisma.destination.deleteMany({})

  console.log('Seeding database with real packages from PDFs...')

  const packages = [
    {
      name: 'Bhutan: Thimphu - Paro - Punakha',
      location: 'Bhutan',
      duration: '8', // 7 Nights - 8 Days
      price: '39000',
      originalPrice: '45000',
      featured: true,
      category: 'Mountain',
      rating: 4.8,
      reviews: 112,
      shortDescription: 'Explore the land of the Thunder Dragon, covering Thimphu, Paro, and Punakha.',
      image: '/assets/images/packages/bhutan.jpg',
      pdfUrl: '/TOUR/DIWALI 2026 PDF/ENG PDF/BHUTAN 7N-8D.pdf',
      highlights: ['Tashicho Dzong', 'Buddha Drodenma', 'Punakha Dzong', 'Chele La Pass'],
      inclusions: [
        'Sightseeing by Innova, Zylo/Tempo Traveller',
        'Toll tax, parking charges and driver allowance',
        'Breakfast/Dinner, Room Tea maker services',
        'English Speaking Guide'
      ],
      exclusions: [
        'Air/Train Fare',
        'Entry Charges of interest places',
        'Lunch/Hi-Tea',
        'Monuments entry charges'
      ],
      itinerary: [
        { day: 1, title: 'BAGDOGRA-PHUENTSHOLING', description: 'Arrival at Bagdogra airport then proceed to PHUENTSHOLING.' },
        { day: 2, title: 'PHUENTSHOLING - THIMPHU', description: 'After immigration drive for Thimphu through lustrous valleys and mountains.' },
        { day: 3, title: 'THIMPHU LOCAL SIGHTSEEING', description: 'BBS View Point, Tashicho Dzong, Buddha Drodenma, National Memorial Chorten.' },
        { day: 4, title: 'THIMPHU-PUNAKHA', description: 'Transfer to Punakha enroute Dochula Pass.' },
        { day: 5, title: 'PUNAKHA-PARO', description: 'Drive to Paro. Enroute visit Airport Viewpoint, Suspension Iron Chain Bridge.' },
        { day: 6, title: 'PARO', description: 'Move for Chele La Pass, highest motorable point in Bhutan.' },
        { day: 7, title: 'PARO- LATAGURI', description: 'Proceed to LATAGURI, the lush greenery of Gorumar National.' },
        { day: 8, title: 'LATAGURI-BAGDOGRA', description: 'Proceed for Bagdogra Airport for onward destination.' }
      ]
    },
    {
      name: 'Kerala: Trivandrum - Alleppey - Thekkady - Munnar',
      location: 'Kerala, India',
      duration: '8', // 7 Nights - 8 Days
      price: '26000',
      originalPrice: '30000',
      featured: true,
      category: 'Nature',
      rating: 4.9,
      reviews: 245,
      shortDescription: 'Experience the pristine backwaters, tea gardens, and wildlife of God\'s Own Country.',
      image: '/assets/images/packages/kerala.jpg',
      pdfUrl: '/TOUR/DIWALI 2026 PDF/ENG PDF/KERALA 7N-8D.pdf',
      highlights: ['Kovalam Beach', 'Vivekananda Rock', 'Alleppey Backwaters', 'Periyar Lake'],
      inclusions: [
        'Deluxe/Standard accommodations',
        'All transportation by a.c. Vehicle',
        'All permit fee & Hotel Tax',
        'Pure Guj/Jain Meal'
      ],
      exclusions: [
        'Flight/Train fare',
        'Boating, Elephant Safari, Massage',
        'Entry fee & Guide charge'
      ],
      itinerary: [
        { day: 1, title: 'Arrival at Trivandrum', description: 'Transfer to hotel. Visit Padmanabh Temple & Kovalam Beach.' },
        { day: 2, title: 'Kanyakumari', description: 'Proceed for Kanyakumari. Visit Poovar island, Vivekananda Rock Memorial.' },
        { day: 3, title: 'Alleppey Backwaters', description: 'Proceed for Alleppey, the Venice of the east. Enjoy back water ride.' },
        { day: 4, title: 'Thekkady', description: 'Proceed for Thekkady. Visit spice plantation, Katahkaly & Marshal Art Show.' },
        { day: 5, title: 'Periyar Lake & Munnar', description: 'Enjoy wildlife in Periyar Lake. Proceed for Famous Hill Station Munnar.' },
        { day: 6, title: 'Munnar Sightseeing', description: 'Visit Eravikulam wildlife Sanctury & Tea gardens. Visit Echo Point.' },
        { day: 7, title: 'Cochin', description: 'After lunch proceed for Cochin.' },
        { day: 8, title: 'Departure', description: 'Drop to Rly. Station or Airport.' }
      ]
    },
    {
      name: 'North East: Kaziranga - Shillong - Guwahati',
      location: 'North East India',
      duration: '7',
      price: '34000',
      originalPrice: '38000',
      featured: true,
      category: 'Nature',
      rating: 4.7,
      reviews: 88,
      shortDescription: 'Discover the one-horned rhino and the cleanest village in Asia.',
      image: '/assets/images/packages/kaziranga.jpg',
      pdfUrl: '/TOUR/DIWALI 2026 PDF/ENG PDF/NORTH EAST 6N - 7D.pdf',
      highlights: ['Kamakhya Devi Temple', 'Kaziranga Elephant Safari', 'Umiam Lake', 'Living Root Bridge'],
      inclusions: [
        'Deluxe/Standard accommodation',
        'Transportation & sightseeing as per itinerary',
        'Breakfast & Dinner',
        'Elephant & Jeep Safari (Complimentary)'
      ],
      exclusions: [
        'Rail/Air Fare',
        'River rafting, rope way, Cruise',
        'Laundry service, Entry Fee, Guide Charge'
      ],
      itinerary: [
        { day: 1, title: 'Guwahati', description: 'Arrive at Guwahati Airport / Railway Station & transfer to hotel.' },
        { day: 2, title: 'Guwahati - Kaziranga', description: 'Visit Kamakhya Devi Temple then proceed for Kaziranga.' },
        { day: 3, title: 'Kaziranga Safari', description: 'Explore Kaziranga National Park on back of Elephant & Jeep Safari.' },
        { day: 4, title: 'Kaziranga - Shillong', description: 'Proceed for Shillong - Capital of Meghalaya. En route visit Umiam Lake.' },
        { day: 5, title: 'Shillong (Mawlynnong)', description: 'Explore Mawlynnong village (Cleanest Village) & Living Root Bridge.' },
        { day: 6, title: 'Cherrapunjee', description: 'Proceed to Cherrapunjee. Visit Elephant Falls, Mawsmai Caves.' },
        { day: 7, title: 'Departure', description: 'Transfer to Guwahati Railway station/Airport.' }
      ]
    },
    {
      name: 'North East: Tawang & Dirang',
      location: 'Arunachal Pradesh, India',
      duration: '11',
      price: '50000',
      originalPrice: '55000',
      featured: true,
      category: 'Mountain',
      rating: 4.8,
      reviews: 95,
      shortDescription: 'An extensive tour covering Bomdila, Tawang, Kaziranga, and Shillong.',
      image: '/assets/images/packages/tawang.jpg',
      pdfUrl: '/TOUR/DIWALI 2026 PDF/ENG PDF/NORTH EAST 10N - 11D.pdf',
      highlights: ['Sela Pass', 'Tawang Monastery', 'Bumla Pass', 'Elephant Falls'],
      inclusions: [
        'Standard accommodation',
        'Inner line permit of Arunachal Pradesh',
        'Bumla Pass, Elephant & Jeep Safari',
        'Pure Guj./Jain food'
      ],
      exclusions: [
        'Rail/Air Fare',
        'Boating in Dawki, river rafting',
        'Entry Fee, Guide Charge'
      ],
      itinerary: [
        { day: 1, title: 'Guwahati', description: 'Arrive at Guwahati & transfer to hotel.' },
        { day: 2, title: 'Bomdila/Dirang', description: 'Visit Kamakhya Devi temple then proceed for Bomdila/Dirang.' },
        { day: 3, title: 'Tawang', description: 'Proceed for Tawang. Enroute visit Sela Pass & Jaswantgarh.' },
        { day: 4, title: 'Bumla Pass', description: 'Visit Bumla Pass (Indo China border) & Madhuri Lake.' },
        { day: 5, title: 'Tawang Monastery', description: 'Visit Tawang Monastery then proceed for Dirang.' },
        { day: 6, title: 'Kaziranga', description: 'Proceed for Kaziranga National Park.' },
        { day: 7, title: 'Kaziranga Safari', description: 'Explore Kaziranga National Park.' },
        { day: 8, title: 'Shillong', description: 'Proceed for Shillong.' },
        { day: 9, title: 'Dawki & Mawlynnong', description: 'Explore Dawki and Mawlynnong village.' },
        { day: 10, title: 'Cherrapunjee', description: 'Visit Elephant Falls, Mawsmai Caves. Proceed for Guwahati.' },
        { day: 11, title: 'Departure', description: 'Transfer to Guwahati Airport.' }
      ]
    },
    {
      name: 'Sikkim: Darjeeling - Gangtok - Lachung',
      location: 'Sikkim, India',
      duration: '8',
      price: '35000',
      originalPrice: '40000',
      featured: true,
      category: 'Mountain',
      rating: 4.8,
      reviews: 156,
      shortDescription: 'Witness the sunrise at Tiger Hills and the beautiful Yumthang Valley.',
      image: '/assets/images/packages/sikkim-1.jpg',
      pdfUrl: '/TOUR/DIWALI 2026 PDF/ENG PDF/SIKKIM 7N-8D 2N LACHUNG.pdf',
      highlights: ['Tiger Hills', 'Chardham in Namchi', 'Yumthang Valley', 'Changu Lake'],
      inclusions: [
        'Deluxe/Standard accommodations',
        'All transportation by non a.c. Vehicle',
        'Breakfast & Dinner (Pure Veg.)'
      ],
      exclusions: [
        'Flight/Train fare',
        'Yak riding, Ropeway',
        'Entry fee & Guide charge'
      ],
      itinerary: [
        { day: 1, title: 'Arrival at Darjeeling', description: 'Arrival at New Jalpaigudi Rly. Station/ Bagdogra Airport then proceed for Darjeeling.' },
        { day: 2, title: 'Tiger Hills', description: 'Visit sunrise point (Tiger Hills), Batasiya Loop & Ghoom Monastery.' },
        { day: 3, title: 'Gangtok', description: 'Proceed for Gangtok. Enroute Chardham (Sarveshwr Temple) in Namchi.' },
        { day: 4, title: 'Lachung', description: 'Visit Ganesh Tank, Hanuman Tank then proceed to Lachung.' },
        { day: 5, title: 'Yumthang Valley', description: 'Proceed for Yumthang Valley (Valley of Flower).' },
        { day: 6, title: 'Gangtok', description: 'Proceed for Gangtok. Rest of time for leisure.' },
        { day: 7, title: 'Changu Lake', description: 'Full day sightseeing - visit Changu Lake & Baba Harbhajan Memorial.' },
        { day: 8, title: 'Departure', description: 'Proceed for New Jalpaigudi rly. Station/Bagdogra Airport.' }
      ]
    },
    {
      name: 'Sikkim: Darjeeling - Pelling - Gangtok - Lachung',
      location: 'Sikkim, India',
      duration: '9',
      price: '37000',
      originalPrice: '42000',
      featured: true,
      category: 'Heritage',
      rating: 4.9,
      reviews: 132,
      shortDescription: 'An extended Sikkim tour including Pelling and the Pemayangtse Monastery.',
      image: '/assets/images/packages/sikkim-2.jpg',
      pdfUrl: '/TOUR/DIWALI 2026 PDF/ENG PDF/SIKKIM 8N-9D WITH 2N LACHUNG.pdf',
      highlights: ['Pelling Sky Walk', 'Pemayangtse Monastery', 'Tiger Hills', 'Yumthang Valley'],
      inclusions: [
        'Deluxe/Standard accommodations',
        'All transportation by non a.c. Vehicle',
        'Breakfast & Dinner (Pure Veg.)'
      ],
      exclusions: [
        'Flight/Train fare',
        'Yak riding, Ropeway',
        'Entry fee & Guide charge'
      ],
      itinerary: [
        { day: 1, title: 'Arrival at Darjeeling', description: 'Proceed for Darjeeling from Bagdogra.' },
        { day: 2, title: 'Darjeeling Local', description: 'Visit Tiger Hills, Batasiya Loop, and tea gardens.' },
        { day: 3, title: 'Pelling', description: 'Proceed for Pelling. Visit Rabdantse Ruins, Pemayangtse Monastery & Sky Walk.' },
        { day: 4, title: 'Gangtok', description: 'Proceed for Gangtok. Enroute Chardham in Namchi.' },
        { day: 5, title: 'Lachung', description: 'Visit Ganesh Tank, Hanuman Tank then proceed to Lachung.' },
        { day: 6, title: 'Yumthang Valley', description: 'Proceed for Yumthang Valley.' },
        { day: 7, title: 'Gangtok', description: 'Proceed for Gangtok. Evening free for leisure.' },
        { day: 8, title: 'Changu Lake', description: 'Visit Changu Lake & Baba Harbhajan Memorial. Enroute Nathula Pass.' },
        { day: 9, title: 'Departure', description: 'Proceed for New Jalpaigudi rly. Station/Bagdogra Airport.' }
      ]
    },
    {
      name: 'Vietnam: Ha Noi - Halong Bay - Phu Quoc - Da Nang',
      location: 'Vietnam',
      duration: '9',
      price: '139000',
      originalPrice: '145000',
      featured: true,
      category: 'International',
      rating: 4.9,
      reviews: 84,
      shortDescription: 'Explore the best of Vietnam including Halong Bay cruise and Phu Quoc islands.',
      image: '/assets/images/packages/vietnam.jpg',
      pdfUrl: '/TOUR/VIETNAM%20PDF/NEW%208N%20-9D%20WITH%20PHU%20QUOC%20MAY-JUNE.pdf',
      highlights: ['Halong Bay Cruise', 'Vin Safari & Grand World', 'Golden Bridge', 'Hoian Ancient Town'],
      inclusions: [
        'Economy class Air Fare including 2 Domestic flights',
        'Meals - Breakfast & Dinner',
        'Visa to Vietnam & Compulsory Tip',
        'All entrance fees and sightseeing'
      ],
      exclusions: [
        'GST 5% & TCS 5%',
        'Travel Insurance',
        'Meals not mentioned in the program',
        'Tips, Drinks, Personal Expenses'
      ],
      itinerary: [
        { day: 1, title: 'Ha Noi Arrival - Halong Bay Cruise', description: 'Welcome to Hanoi! Transfer to Ha Long Bay for overnight cruise.' },
        { day: 2, title: 'Halong - Ha Noi Half Day City Tour', description: 'Cruise morning activities. Disembark and transfer to Ha Noi. Visit Ho Chi Minh Mausoleum and local streets.' },
        { day: 3, title: 'Ha Noi - Phu Quoc', description: 'Flight to Phu Quoc, Vietnam’s largest island. Enjoy beaches and snorkeling.' },
        { day: 4, title: 'Phu Quoc 4 Islets', description: 'Speed boat to 4 islets. Snorkeling, swimming, and Aquatopia water park via Cable car.' },
        { day: 5, title: 'Phu Quoc - Vin Safari & Grand World', description: 'Visit VINPEARL SAFARI and VIN WONDERS THEME PARK.' },
        { day: 6, title: 'Phu Quoc - Da Nang', description: 'Flight to Da Nang. Visit Han Market, Dragon Bridge, and Linh Ung Pagoda.' },
        { day: 7, title: 'Bana Hills - Golden Bridge', description: 'Cable car to Ba Na Hills. Walk on the iconic Golden Bridge and visit Fantasy Park.' },
        { day: 8, title: 'Marble Mountain - Hoian', description: 'Visit Marble Mountain, Cam Thanh Coconut Village, and Hoi An Ancient Town.' },
        { day: 9, title: 'Departure', description: 'Check out from Hotel & transfer to Airport for onward destination.' }
      ]
    }
  ]

  for (const pkg of packages) {
    await prisma.package.create({
      data: pkg
    })
  }
  console.log('Seeded 6 packages successfully!')

  // Add dummy destinations
  await prisma.destination.createMany({
    data: [
      { name: 'Bhutan', favorableMonths: [3,4,5,9,10,11], description: 'Land of Thunder Dragon' },
      { name: 'Kerala', favorableMonths: [10,11,12,1,2,3], description: 'Gods Own Country' },
      { name: 'Sikkim', favorableMonths: [3,4,5,6,10,11], description: 'Mountain Paradise' },
      { name: 'North East', favorableMonths: [10,11,12,1,2,3,4,5], description: 'Unexplored Beauty' },
      { name: 'Vietnam', favorableMonths: [1,2,3,4,5,10,11,12], description: 'Timeless Charm' }
    ]
  })
  console.log('Seeded 4 destinations successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
