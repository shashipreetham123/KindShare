const { MongoClient } = require('mongodb');

async function seed() {
    const client = new MongoClient('mongodb://127.0.0.1:27017');
    try {
        await client.connect();
        const db = client.db('kindshare');
        const productsCol = db.collection('products');
        const usersCol = db.collection('users');

        await usersCol.updateOne(
            { username: 'sarah_gives' },
            { $set: { username: 'sarah_gives', type: 'individual', verified: true, email: 'sarah@example.com' } },
            { upsert: true }
        );
        await usersCol.updateOne(
            { username: 'alex_shares' },
            { $set: { username: 'alex_shares', type: 'individual', verified: false, email: 'alex@example.com' } },
            { upsert: true }
        );

        const sampleProducts = [
            {
                name: 'Warm Winter Jacket (Large)',
                description: 'Gently used insulated waterproof jacket, perfect for cold winter months.',
                username: 'sarah_gives',
                quantity: 4,
                coverImage: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=600&auto=format&fit=crop&q=80',
                accessLevel: 4,
                images: ['https://images.unsplash.com/photo-1544923246-77307dd654cb?w=600&auto=format&fit=crop&q=80'],
                listedAt: new Date(Date.now() - 3600000 * 2)
            },
            {
                name: 'Organic Canned Soups & Beans Pack',
                description: 'Assorted unexpired wholesome vegetable and lentil canned soups.',
                username: 'sarah_gives',
                quantity: 15,
                coverImage: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=600&auto=format&fit=crop&q=80',
                accessLevel: 4,
                images: ['https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=600&auto=format&fit=crop&q=80'],
                listedAt: new Date(Date.now() - 3600000 * 5)
            },
            {
                name: 'Children Storybooks Collection',
                description: 'Set of 10 illustrated storybooks for ages 4 to 9 in pristine condition.',
                username: 'alex_shares',
                quantity: 8,
                coverImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80',
                accessLevel: 4,
                images: ['https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80'],
                listedAt: new Date(Date.now() - 3600000 * 12)
            },
            {
                name: 'Thermal Blankets (Fleece)',
                description: 'Brand new unopened thermal blankets for local shelter relief.',
                username: 'sarah_gives',
                quantity: 20,
                coverImage: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&auto=format&fit=crop&q=80',
                accessLevel: 4,
                images: ['https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&auto=format&fit=crop&q=80'],
                listedAt: new Date(Date.now() - 3600000 * 24)
            },
            {
                name: 'First Aid & Hygiene Care Kit',
                description: 'Emergency essentials including bandages, sanitizers, and soap packs.',
                username: 'admin',
                quantity: 12,
                coverImage: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=600&auto=format&fit=crop&q=80',
                accessLevel: 4,
                images: ['https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=600&auto=format&fit=crop&q=80'],
                listedAt: new Date(Date.now() - 3600000 * 36)
            },
            {
                name: 'Stainless Steel Cookware Set',
                description: 'Durable pots and pans set for community kitchen or transitional housing.',
                username: 'alex_shares',
                quantity: 3,
                coverImage: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600&auto=format&fit=crop&q=80',
                accessLevel: 4,
                images: ['https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600&auto=format&fit=crop&q=80'],
                listedAt: new Date(Date.now() - 3600000 * 48)
            }
        ];

        for (const p of sampleProducts) {
            await productsCol.updateOne({ name: p.name }, { $set: p }, { upsert: true });
        }

        const total = await productsCol.countDocuments();
        console.log(`Successfully seeded sample products! Total products in collection: ${total}`);
    } catch (err) {
        console.error('Seed error:', err);
    } finally {
        await client.close();
    }
}

seed();
