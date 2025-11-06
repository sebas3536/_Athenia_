import { cva, VariantProps } from 'class-variance-authority';

export const switchVariants = cva(
  
  'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=unchecked]:bg-input',

  {
    variants: {
      zType: {
        default: `
          data-[state=checked]:bg-primary
          data-[state=checked]:border-[#028f63]
          data-[state=unchecked]:border-[#a3e4cf]
        `,
        destructive: `
          data-[state=checked]:bg-destructive
          data-[state=checked]:border-red-700
          data-[state=unchecked]:border-gray-300
        `,
      },
      zSize: {
        default: 'h-6 w-11',
        sm: 'h-5 w-9',
        lg: 'h-7 w-13',
      },
    },
    defaultVariants: {
      zType: 'default',
      zSize: 'default',
    },
  }
);

export type ZardSwitchVariants = VariantProps<typeof switchVariants>;