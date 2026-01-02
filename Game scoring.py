
def scoring_system():
    
    length=int(input("how many players?  "))

    names=['']*length
    histories=[[0]]*length
    histories=[i[:] for i in histories]

    for i in range(length):
        names[i]=input(f"name {i+1}: ")

    next_round=True

    while next_round:
        for i in range(length):
            histories[i].append(int(input(f"{names[i]}'s turn: ")))
        print("\n------ Scores so far ------")
        for i in range(length):
            print(names[i], histories[i][1:], sum(histories[i][1:]))
        print("---------------------\n")

        if input("want to carry on? (y/n) : ") == 'n':
            next_round = False
        print()

    totals=[sum(i) for i in histories]

    print(names,totals,sep='\n')


scoring_system()
      