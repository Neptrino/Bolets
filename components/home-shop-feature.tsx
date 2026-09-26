import "@/app/styles/home-shop.css";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import { ShopLink } from "@/components/shop-link";
import { StaticMediaImage } from "@/components/static-media-image";

const products = [
  {
    name: "Samarreta «Bolets de Catalunya»",
    path: "/products/samarreta-bolets-de-catalunya",
    image: "/media/editorial/shop/samarreta-bolets-de-catalunya.webp",
    alt: "Dona amb la samarreta ivori «Bolets de Catalunya», amb dotze bolets comestibles il·lustrats",
  },
  {
    name: "Dessuadora CEP",
    path: "/products/dessuadora-cep",
    image: "/media/editorial/shop/dessuadora-cep.webp",
    alt: "Home assegut amb la dessuadora blanca CEP, amb un cep il·lustrat sobre el nom",
  },
  {
    name: "Làmina «Bolets de Catalunya»",
    path: "/products/lamina-bolets-de-catalunya",
    image: "/media/editorial/shop/lamina-bolets-de-catalunya.webp",
    alt: "Dona sostenint la làmina «Bolets de Catalunya» amb dotze bolets il·lustrats",
  },
] as const;

export function HomeShopFeature() {
  return (
    <section className="card home-shop page-width" aria-labelledby="home-shop-title">
      <div className="home-shop-copy">
        <p className="eyebrow"><ShoppingBag size={15} /> La botiga de Bolets Atles</p>
        <h2 id="home-shop-title">Samarretes i làmines que mantenen l’atles obert</h2>
        <p className="home-shop-lede">Les nostres il·lustracions dels bolets de Catalunya, estampades per encàrrec en samarretes, dessuadores, tasses i làmines. El mapa i les fitxes són gratuïts i sense publicitat: cada compra ens ajuda a mantenir-los.</p>
        <ShopLink placement="home" className="button">Visita la botiga <ArrowUpRight size={17} aria-hidden="true" /></ShopLink>
      </div>
      <ul className="home-shop-products" aria-label="Productes destacats de la botiga">
        {products.map((product) => (
          <li key={product.path}>
            <ShopLink placement="home" path={product.path}>
              <span className="home-shop-photo">
                <StaticMediaImage src={product.image} alt={product.alt} fill sizes="(max-width: 680px) 30vw, (max-width: 1000px) 30vw, 18vw" />
              </span>
              <span className="home-shop-name">{product.name}</span>
            </ShopLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
