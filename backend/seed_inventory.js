const { MongoClient, ObjectId } = require('mongodb');

async function seedComprehensiveInventory() {
    const client = new MongoClient('mongodb://127.0.0.1:27017');
    try {
        await client.connect();
        const db = client.db('kindshare');
        const productsCol = db.collection('products');
        const usersCol = db.collection('users');

        // Target active accounts that you or the user test with
        const targetUsers = ['admin', 'user1', 'test'];

        console.log('Seeding rich inventory items for users:', targetUsers);

        const sampleItems = [
            // Items for admin
            {
                name: 'Emergency Thermal Blankets (Box of 20)',
                description: 'Heavy duty, windproof and moisture-resistant thermal survival blankets for local shelter warming drives.',
                username: 'admin',
                quantity: 20,
                coverImage: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&auto=format&fit=crop&q=80',
                accessLevel: 4,
                images: [
                    'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&auto=format&fit=crop&q=80'
                ],
                listedAt: new Date(Date.now() - 3600000 * 3)
            },
            {
                name: 'Comprehensive First Aid & Trauma Kit',
                description: 'Certified medical supply kit containing sterile gauze, antiseptic wipes, tourniquets, and emergency scissors.',
                username: 'admin',
                quantity: 12,
                coverImage: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=800&auto=format&fit=crop&q=80',
                accessLevel: 4,
                images: [
                    'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=800&auto=format&fit=crop&q=80'
                ],
                listedAt: new Date(Date.now() - 3600000 * 8)
            },
            {
                name: 'Non-Perishable Family Meal Packs',
                description: 'Nutritious dry beans, oats, canned whole tomatoes, and brown rice packages ready for immediate community relief.',
                username: 'admin',
                quantity: 35,
                coverImage: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=800&auto=format&fit=crop&q=80',
                accessLevel: 4,
                images: [
                    'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=800&auto=format&fit=crop&q=80'
                ],
                listedAt: new Date(Date.now() - 3600000 * 18)
            },
            {
                name: 'Portable Clean Water Filtration Sets',
                description: 'Gravity-fed micro-filtration units capable of filtering up to 100,000 gallons for emergency setups.',
                username: 'admin',
                quantity: 6,
                coverImage: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=800&auto=format&fit=crop&q=80',
                accessLevel: 4,
                images: [
                    'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=800&auto=format&fit=crop&q=80'
                ],
                listedAt: new Date(Date.now() - 3600000 * 30)
            },

            // Items for user1
            {
                name: 'Men Winter Down Parka (Size L)',
                description: 'Insulated down weather-resistant parka jacket, clean and sanitized, excellent condition for cold seasons.',
                username: 'user1',
                quantity: 3,
                coverImage: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=800&auto=format&fit=crop&q=80',
                accessLevel: 4,
                images: [
                    'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=800&auto=format&fit=crop&q=80'
                ],
                listedAt: new Date(Date.now() - 3600000 * 4)
            },
            {
                name: 'Elementary School Backpacks & Supplies Set',
                description: 'Padded durable backpacks loaded with notebooks, colored pencil sets, rulers, and glue sticks for young students.',
                username: 'user1',
                quantity: 8,
                coverImage: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
                accessLevel: 4,
                images: [
                    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80'
                ],
                listedAt: new Date(Date.now() - 3600000 * 12)
            },
            {
                name: 'Organic Whole Grain Cereal & Milk Powder',
                description: 'Nutritious breakfast supplies with extended expiration dates for local families and pantries.',
                username: 'user1',
                quantity: 14,
                coverImage: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80',
                accessLevel: 4,
                images: [
                    'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80'
                ],
                listedAt: new Date(Date.now() - 3600000 * 20)
            },
            {
                name: 'Kitchen Cookware & Utensils Starter Pack',
                description: 'Complete nonstick frying pan, stockpot, ladles, and silicone spatulas for family transitional homes.',
                username: 'user1',
                quantity: 5,
                coverImage: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80',
                accessLevel: 4,
                images: [
                    'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80'
                ],
                listedAt: new Date(Date.now() - 3600000 * 40)
            },

            // Items for test
            {
                name: 'Children Illustrated Reading Books Set',
                description: 'Collection of 12 engaging adventure and science picture books for ages 5-10, gentle condition.',
                username: 'test',
                quantity: 7,
                coverImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80',
                accessLevel: 4,
                images: [
                    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80'
                ],
                listedAt: new Date(Date.now() - 3600000 * 6)
            },
            {
                name: 'Warm Knit Beanies & Wool Mittens (Pack of 5)',
                description: 'Warm fleece-lined winter hats and stretch wool gloves in assorted colors, brand new.',
                username: 'test',
                quantity: 16,
                coverImage: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=800&auto=format&fit=crop&q=80',
                accessLevel: 4,
                images: [
                    'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=800&auto=format&fit=crop&q=80'
                ],
                listedAt: new Date(Date.now() - 3600000 * 16)
            },
            {
                name: 'Baby Diapers & Sensitive Wipes Bundle',
                description: 'Unopened newborn and size 2 diaper boxes with hypoallergenic wipes packs.',
                username: 'test',
                quantity: 9,
                coverImage: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&auto=format&fit=crop&q=80',
                accessLevel: 4,
                images: [
                    'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&auto=format&fit=crop&q=80'
                ],
                listedAt: new Date(Date.now() - 3600000 * 28)
            }
        ];

        for (const item of sampleItems) {
            await productsCol.updateOne(
                { name: item.name, username: item.username },
                { $set: item },
                { upsert: true }
            );
            console.log(`Saved product "${item.name}" for user @${item.username}`);
        }

        const totalNow = await productsCol.countDocuments();
        console.log(`Total products in collection now: ${totalNow}`);
    } catch (err) {
        console.error('Seed error:', err);
    } finally {
        await client.close();
    }
}

seedComprehensiveInventory();
