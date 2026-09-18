"use client";

import React, { useState } from "react";
import Image from "next/image";
import { MenuItem, CartItem } from "../types";
import { Search, Flame, Clock, Star, Plus, Minus, Check, MessageSquare, Sparkles } from "lucide-react";

interface MenuExplorerProps {
  items: MenuItem[];
  categories: string[];
  cart: CartItem[];
  onAddToCart: (slug: string) => void;
  onIncrement: (slug: string) => void;
  onDecrement: (slug: string) => void;
  onAskAI: (prompt: string) => void;
}

export const MenuExplorer: React.FC<MenuExplorerProps> = ({
  items,
  categories,
  cart,
  onAddToCart,
  onIncrement,
  onDecrement,
  onAskAI,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dietaryFilter, setDietaryFilter] = useState<string>("all");

  const getItemQuantity = (slug: string) => {
    const found = cart.find((i) => i.slug === slug);
    return found ? found.quantity : 0;
  };

  const filteredItems = items.filter((item) => {
    // Category check
    if (selectedCategory !== "all" && item.category.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    // Dietary filter check
    if (dietaryFilter === "vegetarian" && !item.dietary.includes("vegetarian")) return false;
    if (dietaryFilter === "vegan" && !item.dietary.includes("vegan")) return false;
    if (dietaryFilter === "gluten-free" && !item.dietary.includes("gluten-free")) return false;
    if (dietaryFilter === "spicy" && item.spicy_level === 0) return false;

    // Search query check
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchIngr = item.ingredients.some((ing) => ing.toLowerCase().includes(q));
      const matchAlias = item.aliases?.some((a) => a.toLowerCase().includes(q));
      return matchName || matchDesc || matchIngr || matchAlias;
    }
    return true;
  });

  return (
    <section className="w-full space-y-6">
      {/* Search & Filter Header */}
      <div className="bg-white p-5 rounded-3xl border border-artisan-sand shadow-card space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input with Vector RAG hint */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-artisan-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, ingredients, or dietary preferences (e.g. 'truffle', 'vegan', 'pzza')..."
              className="w-full pl-11 pr-4 py-3 bg-artisan-cream/70 border border-artisan-sand rounded-2xl text-sm text-artisan-charcoal placeholder-artisan-muted focus:outline-none focus:ring-2 focus:ring-artisan-terracotta/20 focus:border-artisan-terracotta transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-artisan-muted hover:text-artisan-charcoal bg-artisan-sand/60 px-2 py-0.5 rounded-lg"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Dietary Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: "all", label: "All Diets" },
              { id: "vegetarian", label: "🌱 Veg" },
              { id: "vegan", label: "🌿 Vegan" },
              { id: "gluten-free", label: "🌾 Gluten-Free" },
              { id: "spicy", label: "🌶️ Spicy" },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDietaryFilter(d.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  dietaryFilter === d.id
                    ? "bg-artisan-charcoal text-white shadow-sm"
                    : "bg-artisan-sand/50 text-artisan-slate hover:bg-artisan-sand"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto border-t border-artisan-sand/50 pt-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold capitalize transition-all duration-150 ${
                selectedCategory === cat
                  ? "bg-artisan-terracotta text-white shadow-glow"
                  : "bg-white text-artisan-slate hover:bg-artisan-cream border border-artisan-sand"
              }`}
            >
              {cat === "all" ? "🍽️ Full Menu" : cat === "mains" ? "🍕 Mains" : cat === "drinks" ? "☕ Drinks" : "🍨 Desserts"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Dishes */}
      {filteredItems.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-artisan-sand text-center space-y-3">
          <p className="text-artisan-muted text-base">No dishes found matching your criteria.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setDietaryFilter("all");
            }}
            className="px-4 py-2 bg-artisan-terracotta text-white text-xs font-semibold rounded-xl"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const qty = getItemQuantity(item.slug);
            return (
              <div
                key={item.slug}
                className="group bg-white rounded-3xl border border-artisan-sand shadow-subtle hover:shadow-card hover:border-artisan-amber/40 transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Image Container */}
                <div className="relative h-48 w-full overflow-hidden bg-artisan-sand/40">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                  {/* Rating Badge */}
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl text-xs font-bold text-artisan-charcoal flex items-center shadow-sm">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 mr-1" />
                    {item.rating}
                  </div>

                  {/* Price Tag */}
                  <div className="absolute top-3 right-3 bg-artisan-terracotta text-white px-3 py-1 rounded-xl text-xs font-bold shadow-md">
                    Rs.{item.price}
                  </div>

                  {/* Dietary Pills on Image */}
                  <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                    {item.dietary.map((d) => (
                      <span
                        key={d}
                        className="bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-lg text-[10px] font-semibold capitalize"
                      >
                        {d}
                      </span>
                    ))}
                    {item.spicy_level > 0 && (
                      <span className="bg-red-500/80 backdrop-blur-md text-white px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center">
                        <Flame className="w-3 h-3 mr-0.5" />
                        Spicy
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-artisan-charcoal leading-snug group-hover:text-artisan-terracotta transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-artisan-muted mt-1.5 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Dish Specs (Prep time, Calories) */}
                  <div className="flex items-center justify-between text-xs text-artisan-slate border-t border-artisan-sand/40 pt-3">
                    <div className="flex items-center space-x-1 text-artisan-muted">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{item.prep_time_mins} mins</span>
                    </div>
                    <div className="text-artisan-muted">
                      <span>{item.calories} kcal</span>
                    </div>
                  </div>

                  {/* Actions: Add to Cart / Quantity Selector + Ask AI */}
                  <div className="flex items-center space-x-2 pt-1">
                    {qty === 0 ? (
                      <button
                        onClick={() => onAddToCart(item.slug)}
                        className="flex-1 py-2.5 px-4 bg-artisan-cream hover:bg-artisan-terracotta hover:text-white text-artisan-charcoal font-semibold text-xs rounded-2xl border border-artisan-sand hover:border-artisan-terracotta transition-all duration-200 flex items-center justify-center space-x-1.5 shadow-sm active:scale-98"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Order</span>
                      </button>
                    ) : (
                      <div className="flex-1 flex items-center justify-between bg-artisan-sand/60 rounded-2xl p-1 border border-artisan-sand">
                        <button
                          onClick={() => onDecrement(item.slug)}
                          className="w-8 h-8 rounded-xl bg-white text-artisan-charcoal flex items-center justify-center shadow-sm hover:bg-artisan-terracotta hover:text-white transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-artisan-charcoal px-2">
                          {qty} in Cart
                        </span>
                        <button
                          onClick={() => onIncrement(item.slug)}
                          className="w-8 h-8 rounded-xl bg-white text-artisan-charcoal flex items-center justify-center shadow-sm hover:bg-artisan-terracotta hover:text-white transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Ask AI Button */}
                    <button
                      onClick={() => onAskAI(`Tell me more about ${item.name}, its ingredients and pairing recommendations!`)}
                      className="p-2.5 rounded-2xl bg-white hover:bg-artisan-amberLight text-artisan-slate hover:text-artisan-charcoal border border-artisan-sand transition-colors"
                      title="Ask AI Concierge about this dish"
                    >
                      <Sparkles className="w-4 h-4 text-artisan-amber" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
