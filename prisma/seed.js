import prisma from '../config/prisma.js'

async function main() {
  console.log('Clearing old data...')
  await prisma.package.deleteMany({})
  await prisma.destination.deleteMany({})

  console.log('Seeding database with initial packages and destinations...')

  // Insert a couple of Destinations
  await prisma.destination.createMany({
    data: [
      { name: 'Goa', description: 'Beaches, nightlife, and portuguese heritage', favorableMonths: [9, 10, 11, 0, 1, 2] },
      { name: 'Manali', description: 'Snow-capped mountains and adventure sports', favorableMonths: [2, 3, 4, 5, 9, 10] },
      { name: 'Kerala', description: 'Backwaters, tea gardens, and wildlife', favorableMonths: [8, 9, 10, 11, 0, 1] },
      { name: 'Bali', description: 'Island of gods, beaches, and temples', favorableMonths: [3, 4, 5, 6, 7, 8, 9] },
    ],
    skipDuplicates: true
  })

  // Insert a few Packages
  await prisma.package.createMany({
    data: [
      {
        name: 'Majestic Manali Getaway',
        location: 'Manali, Himachal Pradesh',
        duration: '4',
        price: '12500',
        originalPrice: '15000',
        featured: true,
        category: 'Mountain',
        rating: 4.8,
        reviews: 124,
        shortDescription: 'Experience the magic of snow-capped peaks and adventurous valleys in Manali.',
        image: 'https://images.unsplash.com/photo-1605649487212-4dcb1b6b1834?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        highlights: ['Solang Valley', 'Rohtang Pass', 'Hadimba Temple', 'Mall Road'],
        itinerary: [
          { day: 1, title: 'Arrival & Local Sightseeing', description: 'Arrive and visit Hadimba Temple, Vashisht Hot Springs.' },
          { day: 2, title: 'Solang Valley Adventure', description: 'Enjoy skiing, paragliding, and snow activities at Solang Valley.' },
          { day: 3, title: 'Rohtang Pass', description: 'Full day excursion to Rohtang Pass for spectacular mountain views.' },
          { day: 4, title: 'Departure', description: 'Shopping at Mall Road and departure.' },
        ],
        inclusions: ['Accommodation', 'Breakfast & Dinner', 'Local Transport', 'Guide'],
        exclusions: ['Flights/Train fare', 'Lunch', 'Adventure activities fees']
      },
      {
        name: 'Goa Beach Holiday',
        location: 'Goa, India',
        duration: '5',
        price: '18000',
        originalPrice: '22000',
        featured: true,
        category: 'Beach',
        rating: 4.7,
        reviews: 210,
        shortDescription: 'Relax on the golden beaches and enjoy vibrant nightlife in Goa.',
        image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e4f2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        highlights: ['Baga Beach', 'Fort Aguada', 'Dudhsagar Waterfalls', 'Cruise'],
        itinerary: [
          { day: 1, title: 'Arrival & North Goa', description: 'Check-in and relax at Baga beach.' },
          { day: 2, title: 'North Goa Tour', description: 'Visit Fort Aguada, Anjuna beach, and Vagator.' },
          { day: 3, title: 'South Goa & Churches', description: 'Explore Old Goa churches, Mangueshi temple, and evening Mandovi river cruise.' },
          { day: 4, title: 'Dudhsagar Waterfalls', description: 'Full day trip to majestic Dudhsagar waterfalls.' },
          { day: 5, title: 'Departure', description: 'Transfer to airport/station.' }
        ],
        inclusions: ['3 Star Accommodation', 'Breakfast', 'Airport Transfers', 'Sightseeing Tours'],
        exclusions: ['Flights', 'Lunch & Dinner', 'Entry tickets']
      },
      {
        name: 'Kerala Backwaters & Tea Gardens',
        location: 'Munnar & Alleppey, Kerala',
        duration: '6',
        price: '24500',
        originalPrice: '28000',
        featured: true,
        category: 'Nature',
        rating: 4.9,
        reviews: 340,
        shortDescription: 'Immerse yourself in God\'s Own Country with houseboats and lush tea gardens.',
        image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        highlights: ['Munnar Tea Estates', 'Alleppey Houseboat', 'Periyar Wildlife Sanctuary', 'Kochi'],
        itinerary: [
          { day: 1, title: 'Arrival in Kochi', description: 'Arrive at Kochi and transfer to Munnar.' },
          { day: 2, title: 'Munnar Sightseeing', description: 'Visit Eravikulam National Park, Mattupetty Dam, and Tea Museum.' },
          { day: 3, title: 'Thekkady', description: 'Transfer to Thekkady and evening boat safari in Periyar Lake.' },
          { day: 4, title: 'Alleppey Houseboat', description: 'Check-in to a traditional houseboat for a backwater cruise and overnight stay.' },
          { day: 5, title: 'Kochi Sightseeing', description: 'Drive to Kochi. Visit Fort Kochi, Chinese Fishing Nets, and Jewish Synagogue.' },
          { day: 6, title: 'Departure', description: 'Transfer to Cochin Airport for departure.' }
        ],
        inclusions: ['Houseboat Stay', 'All Meals in Houseboat', 'Hotel Accommodation', 'Private Cab'],
        exclusions: ['Flights', 'Meals in Hotels', 'Monument Fees']
      },
      {
        name: 'Enchanting Bali Getaway',
        location: 'Bali, Indonesia',
        duration: '5',
        price: '35000',
        originalPrice: '40000',
        featured: true,
        category: 'International',
        rating: 4.6,
        reviews: 185,
        shortDescription: 'Explore beautiful temples, rich culture, and stunning beaches of Bali.',
        image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        highlights: ['Ubud Monkey Forest', 'Tanah Lot Temple', 'Kuta Beach', 'Mount Batur Sunrise'],
        itinerary: [
          { day: 1, title: 'Arrival in Bali', description: 'Welcome to Bali. Transfer to your hotel in Kuta.' },
          { day: 2, title: 'Ubud Tour', description: 'Visit Ubud Monkey Forest, Tegalalang Rice Terrace, and local art markets.' },
          { day: 3, title: 'Temples & Sunsets', description: 'Explore beautiful Ulun Danu Beratan Temple and sunset at Tanah Lot.' },
          { day: 4, title: 'Mount Batur or Beach Day', description: 'Optional early morning trek to Mount Batur or relax at Nusa Dua beach.' },
          { day: 5, title: 'Departure', description: 'Transfer to Denpasar Airport for your onward journey.' }
        ],
        inclusions: ['4 Star Hotel Stay', 'Daily Breakfast', 'Airport Transfers', 'English Speaking Guide'],
        exclusions: ['International Flights', 'Visa Fees', 'Lunch & Dinner']
      }
    ],
    skipDuplicates: true
  })

  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
