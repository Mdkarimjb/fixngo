import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Tag, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { ImagePicker } from './ImagePicker';
import { CITY_OPTIONS } from '../lib/cities';

/** Customer form to list an old product for resale. */
export function SellProductForm() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceRupees, setPriceRupees] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [city, setCity] = useState('Guntur');

  const mutation = useMutation<{ referenceCode: string }, unknown, FormData>({
    mutationFn: async (payload: FormData) =>
      (await api.post('/customers/listings', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'public'] });
      setTitle('');
      setDescription('');
      setPriceRupees('');
      setImages([]);
      setCity('Guntur');
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const rupees = Number(priceRupees);
    if (!title || !Number.isFinite(rupees) || rupees <= 0) return;
    const form = new FormData();
    form.append('title', title);
    if (description) form.append('description', description);
    form.append('pricePaise', String(Math.round(rupees * 100)));
    form.append('city', city);
    images.forEach((image) => form.append('images', image));
    mutation.mutate(form);
  }

  return (
    <form onSubmit={submit} className="dashboard-panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="dashboard-eyebrow">Resell & reuse</p>
          <h2 className="dashboard-title">Sell an old product</h2>
          <p className="mt-1 text-sm text-slate-500">
            List a usable home product in minutes.
          </p>
        </div>
        <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 sm:flex">
          <Tag className="h-5 w-5" />
        </span>
      </div>

      <label
        htmlFor="listing-title"
        className="mt-6 block text-sm font-bold text-slate-700"
      >
        Title
      </label>
      <input
        id="listing-title"
        className="dashboard-input mt-1.5"
        placeholder="e.g. Used washing machine"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <label
        htmlFor="listing-city"
        className="mt-4 block text-sm font-bold text-slate-700"
      >
        City
      </label>
      <select
        id="listing-city"
        className="dashboard-input mt-1.5"
        value={city}
        onChange={(event) => setCity(event.target.value)}
      >
        {CITY_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <ImagePicker files={images} onChange={setImages} label="Product photos" />

      <label
        htmlFor="listing-description"
        className="mt-4 block text-sm font-bold text-slate-700"
      >
        Description (optional)
      </label>
      <textarea
        id="listing-description"
        className="dashboard-input mt-1.5"
        rows={2}
        placeholder="Condition, age, etc."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <label
        htmlFor="listing-price"
        className="mt-4 block text-sm font-bold text-slate-700"
      >
        Price (₹)
      </label>
      <input
        id="listing-price"
        className="dashboard-input mt-1.5"
        type="number"
        min={1}
        placeholder="e.g. 4999"
        value={priceRupees}
        onChange={(e) => setPriceRupees(e.target.value)}
      />

      <button
        type="submit"
        className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground transition hover:bg-brand-dark disabled:opacity-50"
        disabled={!title || !priceRupees || mutation.isPending}
      >
        {mutation.isPending ? (
          'Listing…'
        ) : (
          <>
            List for sale <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      {mutation.isSuccess && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" /> Product listed as{' '}
          {mutation.data.referenceCode}
        </p>
      )}
      {mutation.isError && (
        <p className="mt-2 text-sm text-red-600">
          Could not list the product. Please try again.
        </p>
      )}
    </form>
  );
}
