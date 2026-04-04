"use client";

import { salons } from '@/data/mockData';
import { Card } from '@/components/ui/card';
import { StarRating } from '@/components/StarRating';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

const allReviews = salons.flatMap(s => s.reviews);

const BarberReviews = () => {
  const avg = allReviews.reduce((a, r) => a + r.rating, 0) / allReviews.length;

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b px-4 py-3">
        <h1 className="text-xl font-bold">Sharhlar</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats */}
        <Card className="p-5 text-center">
          <p className="text-4xl font-bold mb-1">{avg.toFixed(1)}</p>
          <StarRating rating={avg} size="md" showValue={false} />
          <p className="text-sm text-muted-foreground mt-1">{allReviews.length} ta sharh</p>
        </Card>

        {/* Rating breakdown */}
        <Card className="p-4 space-y-2">
          {[5, 4, 3, 2, 1].map(r => {
            const count = allReviews.filter(rv => rv.rating === r).length;
            const pct = (count / allReviews.length) * 100;
            return (
              <div key={r} className="flex items-center gap-2 text-sm">
                <span className="w-4 text-right">{r}</span>
                <Star className="h-3 w-3 text-accent fill-accent" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full gold-gradient rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-right text-muted-foreground text-xs">{count}</span>
              </div>
            );
          })}
        </Card>

        {/* Review list */}
        {allReviews.map((review, i) => (
          <motion.div key={review.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <img src={review.userAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{review.userName}</p>
                  <p className="text-xs text-muted-foreground">{review.createdAt}</p>
                </div>
                <StarRating rating={review.rating} size="sm" showValue={false} />
              </div>
              <p className="text-sm text-muted-foreground">{review.comment}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default BarberReviews;
