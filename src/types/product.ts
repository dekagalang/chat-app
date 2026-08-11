export type ProductImage = {
  id?: string | number;
  url?: string;
  alt?: string;
};

export type ProductDetail = {
  id?: number | string;
  slug?: string;
  name?: string;
  price?: string;
  image?: string;
  url?: string;
  outletId?: string | number;
  outlet?: string;
  outletImage?: string;
  images?: ProductImage[];
};
