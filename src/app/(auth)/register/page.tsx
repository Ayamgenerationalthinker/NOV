'use client';

import * as React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShoppingBag, Lock, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  return (
    <Container className="py-20 md:py-28">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-stone-300 mb-6 shadow-xl">
          <ShieldCheck className="h-7 w-7 text-emerald-400" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-serif font-medium text-white tracking-tight">
          Customer Registration Not Required
        </h1>

        <p className="mt-3 text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
          At Tomevari, customers do not need to create or manage an account. All physical and digital purchases are completed directly through secure guest checkout.
        </p>

        <Card className="mt-8 border-zinc-800/80 bg-zinc-950/80 p-6 shadow-2xl backdrop-blur-xl">
          <CardContent className="p-0 space-y-4 text-left">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <ShoppingBag className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-white">Instant Guest Shopping</p>
                <p className="text-zinc-400 mt-0.5">Simply add any piece to your cart and checkout with your email.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-white">Owner & Administrator Console</p>
                <p className="text-zinc-400 mt-0.5">Login is reserved strictly for the pre-configured store administrator.</p>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <Link href="/products" className="w-full">
                <Button className="w-full gap-2 bg-stone-200 text-zinc-950 hover:bg-white text-xs font-semibold py-2.5">
                  Browse Storefront Pieces
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>

              <Link href="/login" className="w-full">
                <Button variant="outline" className="w-full border-zinc-800 text-zinc-300 hover:text-white text-xs py-2.5">
                  Admin Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
